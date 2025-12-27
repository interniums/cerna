import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto/app-encryption'
import type { CalendarEvent } from '@/lib/integrations/google-calendar/events'
import { listUpcomingGoogleEvents } from '@/lib/integrations/google-calendar/events'
import { refreshAccessToken } from '@/lib/integrations/google-calendar/oauth'
import { listUpcomingMicrosoftEvents } from '@/lib/integrations/microsoft-calendar/events'
import { refreshMicrosoftAccessToken } from '@/lib/integrations/microsoft-calendar/oauth'
import { listCalendarAccounts } from '@/lib/db/calendar'

type Provider = 'google' | 'microsoft'

type ApiAccount = {
  id: string
  provider: Provider
  email: string
  displayName: string | null
  enabled: boolean
  lastError: string | null
}

type EventsResponse =
  | {
      ok: true
      accounts: ApiAccount[]
      events: Array<CalendarEvent & { accountId: string; accountEmail: string; provider: Provider }>
    }
  | { ok: false; message: string }

type EventsCacheRow = {
  enabled_account_ids: string[] | null
  events: unknown
  updated_at: string
  provider_cooldowns?: unknown
  provider_backoff?: unknown
}

function hashStringToInt(value: string) {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return h
}

function sameStringSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function isFresh(updatedAtIso: string, ttlMs: number) {
  const t = Date.parse(updatedAtIso)
  if (!Number.isFinite(t)) return false
  return t >= Date.now() - ttlMs
}

function parseProviderError(input: { provider: Provider; error: unknown }): { status: number | null; retryAfterMs: number | null; raw: string } {
  const raw = input.error instanceof Error ? input.error.message : String(input.error ?? '')

  if (input.provider === 'google') {
    const m = raw.match(/^\[google-calendar\]\s+(\d+)\s+/i)
    const status = m ? Number(m[1]) : null
    return { status: Number.isFinite(status) ? status : null, retryAfterMs: null, raw }
  }

  // Microsoft errors in this codebase are normalized as:
  // "[microsoft-calendar] <status> <msg> retry-after=<n>s"
  const m = raw.match(/^\[microsoft-calendar\]\s+(\d+)\s+/i)
  const status = m ? Number(m[1]) : null
  const ra = raw.match(/retry-after=(\d+)s/i)
  const retryAfterSec = ra ? Number(ra[1]) : null
  return {
    status: Number.isFinite(status) ? status : null,
    retryAfterMs: Number.isFinite(retryAfterSec) && (retryAfterSec as number) > 0 ? (retryAfterSec as number) * 1000 : null,
    raw,
  }
}

function isThrottleLike(input: { provider: Provider; status: number | null; message: string }) {
  if (input.status === 429) return true
  if (input.provider === 'google' && input.status === 403) {
    const m = input.message.toLowerCase()
    return m.includes('rate') || m.includes('quota') || m.includes('limit') || m.includes('usage')
  }
  return false
}

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readProviderNumberMap(value: unknown): Record<string, number> {
  const obj = getObjectRecord(value)
  if (!obj) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'string') {
      const n = Number(v)
      if (Number.isFinite(n)) out[k] = n
    }
  }
  return out
}

function readProviderStringMap(value: unknown): Record<string, string> {
  const obj = getObjectRecord(value)
  if (!obj) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v) out[k] = v
  }
  return out
}

function toUserFacingCalendarError(input: { provider: Provider; error: unknown }): string {
  const raw = input.error instanceof Error ? input.error.message : ''
  if (!raw) return 'Couldn’t load events.'

  if (input.provider === 'google') {
    if (raw.includes('insufficient authentication scopes')) {
      return 'Google Calendar permission missing. Reconnect and allow Calendar access.'
    }
    if (raw.includes('Invalid Credentials') || raw.includes('Invalid token')) {
      return 'Google Calendar session expired. Reconnect to continue.'
    }
    if (raw.startsWith('[google-calendar] ')) {
      return raw.replace(/^\[google-calendar\]\s*\d+\s*/i, '').slice(0, 500)
    }
  }

  if (input.provider === 'microsoft') {
    if (raw.toLowerCase().includes('insufficient privileges') || raw.toLowerCase().includes('insufficient_scope')) {
      return 'Microsoft Calendar permission missing. Reconnect to continue.'
    }
  }

  return raw.slice(0, 500)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const workflowId = requestUrl.searchParams.get('workflowId') ?? ''
  if (!workflowId) return NextResponse.json({ ok: false, message: 'Missing workflow id.' } satisfies EventsResponse, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const userRes = await supabase.auth.getUser()
  if (userRes.error || !userRes.data.user) return NextResponse.json({ ok: false, message: 'Not signed in.' } satisfies EventsResponse, { status: 401 })
  const user = userRes.data.user

  const [accountsRes, visibilityRes] = await Promise.all([
    listCalendarAccounts(user.id),
    supabase.from('workflow_calendar_visibility').select('*').eq('workflow_id', workflowId),
  ])

  if (visibilityRes.error) return NextResponse.json({ ok: false, message: 'Couldn’t load calendar settings.' } satisfies EventsResponse, { status: 500 })

  const visibility = (visibilityRes.data ?? []) as Array<{ calendar_account_id: string; enabled: boolean }>
  const enabledMap = new Map(visibility.map((v) => [v.calendar_account_id, Boolean(v.enabled)]))

  const accounts: ApiAccount[] = accountsRes.map((a) => ({
    id: a.id,
    provider: a.provider,
    email: a.email,
    displayName: a.display_name,
    enabled: enabledMap.get(a.id) ?? true,
    lastError: a.last_error,
  }))

  const enabledAccounts = accountsRes.filter((a) => (enabledMap.get(a.id) ?? true) === true)
  if (enabledAccounts.length === 0) {
    return NextResponse.json({ ok: true, accounts, events: [] } satisfies EventsResponse)
  }

  // Phase 1: server-side cache to avoid hammering Google/Graph on frequent refresh.
  // Cache is per (user_id, workflow_id) and invalidates when enabled account ids change.
  // Add a small deterministic jitter so many users don't refresh at the exact same moment.
  const CACHE_TTL_BASE_MS = 2 * 60 * 1000
  const CACHE_TTL_JITTER_MS = hashStringToInt(`${user.id}:${workflowId}`) % 30_000
  const CACHE_TTL_MS = CACHE_TTL_BASE_MS + CACHE_TTL_JITTER_MS
  const enabledAccountIds = enabledAccounts.map((a) => a.id).sort()

  const admin = createSupabaseAdminClient()

  const cacheRes = await admin
    .from('workflow_calendar_events_cache')
    .select('enabled_account_ids, events, updated_at, provider_cooldowns, provider_backoff')
    .eq('user_id', user.id)
    .eq('workflow_id', workflowId)
    .maybeSingle()

  const cached = (cacheRes.data ?? null) as EventsCacheRow | null
  const cachedIds = (cached?.enabled_account_ids ?? []).slice().sort()
  const cachedCooldowns = readProviderStringMap(cached?.provider_cooldowns)
  const cachedBackoff = readProviderNumberMap(cached?.provider_backoff)

  const nowIso = new Date().toISOString()
  const googleCooldownUntilIso = cachedCooldowns.google ?? null
  const msCooldownUntilIso = cachedCooldowns.microsoft ?? null
  const googleCoolingDown = Boolean(googleCooldownUntilIso && Date.parse(googleCooldownUntilIso) > Date.now())
  const msCoolingDown = Boolean(msCooldownUntilIso && Date.parse(msCooldownUntilIso) > Date.now())
  const anyCoolingDown = googleCoolingDown || msCoolingDown

  const cacheValid = Boolean(cached && isFresh(cached.updated_at, CACHE_TTL_MS) && sameStringSet(cachedIds, enabledAccountIds))
  // If we're cooling down due to provider throttling, prefer serving cached data (even stale) instead of retrying upstream.
  if (anyCoolingDown && cached && Array.isArray(cached.events)) {
    return NextResponse.json({
      ok: true,
      accounts,
      events: cached!.events as Array<CalendarEvent & { accountId: string; accountEmail: string; provider: Provider }>,
    } satisfies EventsResponse)
  }
  if (cacheValid && Array.isArray(cached!.events)) {
    return NextResponse.json({
      ok: true,
      accounts,
      events: cached!.events as Array<CalendarEvent & { accountId: string; accountEmail: string; provider: Provider }>,
    } satisfies EventsResponse)
  }

  // Include events that started recently (useful for "join now" in the first few minutes).
  const nowMs = Date.now()
  const timeMinIso = new Date(nowMs - 10 * 60 * 1000).toISOString()
  // Show a 2-day lookahead window in the Command Center widget.
  const timeMaxIso = new Date(nowMs + 48 * 60 * 60 * 1000).toISOString()

  // Guardrails: keep the payload and upstream API usage bounded.
  const EVENTS_PER_ACCOUNT_LIMIT = 10
  const EVENTS_TOTAL_LIMIT = 25

  const out: Array<CalendarEvent & { accountId: string; accountEmail: string; provider: Provider }> = []
  const throttledProviders = new Set<Provider>()
  const providerRetryAfterMs: Partial<Record<Provider, number>> = {}
  const providerHadSuccess = new Set<Provider>()

  async function loadTokens(accountId: string) {
    const tokenRow = await admin.from('calendar_account_tokens').select('*').eq('calendar_account_id', accountId).maybeSingle()
    if (tokenRow.error || !tokenRow.data) return null
    const accessTokenEnc = String((tokenRow.data as { access_token_enc: string }).access_token_enc)
    const refreshTokenEnc = String((tokenRow.data as { refresh_token_enc: string }).refresh_token_enc)
    const expiresAtIso = String((tokenRow.data as { expires_at: string }).expires_at)
    return {
      accessToken: decryptSecret(accessTokenEnc),
      refreshToken: decryptSecret(refreshTokenEnc),
      expiresAtIso,
    }
  }

  async function refreshIfNeeded(input: { accountId: string; provider: Provider; accessToken: string; refreshToken: string; expiresAtIso: string }) {
    const needsRefresh = Date.parse(input.expiresAtIso) <= Date.now() + 60_000
    if (!needsRefresh) return { accessToken: input.accessToken }

    try {
      const refreshed =
        input.provider === 'google'
          ? await refreshAccessToken({ refreshToken: input.refreshToken })
          : await refreshMicrosoftAccessToken({ refreshToken: input.refreshToken })

      const up = await admin
        .from('calendar_account_tokens')
        .update({ access_token_enc: encryptSecret(refreshed.accessToken), expires_at: refreshed.expiresAt })
        .eq('calendar_account_id', input.accountId)
      if (up.error) console.error('[calendar events] token update failed', up.error)

      return { accessToken: refreshed.accessToken }
    } catch (error) {
      console.error('[calendar events] refresh failed', error)
      const msg =
        input.provider === 'microsoft'
          ? 'Reconnect required (may be blocked by your organization).'
          : 'Reconnect required.'
      await supabase.from('calendar_accounts').update({ last_error: msg }).eq('id', input.accountId).eq('user_id', user.id)
      return null
    }
  }

  for (const acct of enabledAccounts) {
    const tokens = await loadTokens(acct.id)
    if (!tokens) continue

    const refreshed = await refreshIfNeeded({ accountId: acct.id, provider: acct.provider, ...tokens })
    if (!refreshed) continue

    try {
      const events =
        acct.provider === 'google'
          ? await listUpcomingGoogleEvents({ accessToken: refreshed.accessToken, limit: EVENTS_PER_ACCOUNT_LIMIT, timeMinIso, timeMaxIso })
          : await listUpcomingMicrosoftEvents({ accessToken: refreshed.accessToken, limit: EVENTS_PER_ACCOUNT_LIMIT, timeMinIso, timeMaxIso })

      for (const e of events) out.push({ ...e, accountId: acct.id, accountEmail: acct.email, provider: acct.provider })
      providerHadSuccess.add(acct.provider)

      if (acct.last_error) {
        await supabase.from('calendar_accounts').update({ last_error: null }).eq('id', acct.id).eq('user_id', user.id)
      }
    } catch (error) {
      console.error('[calendar events] list events failed', { provider: acct.provider, error })
      const msg = toUserFacingCalendarError({ provider: acct.provider, error })
      const parsed = parseProviderError({ provider: acct.provider, error })
      if (isThrottleLike({ provider: acct.provider, status: parsed.status, message: parsed.raw })) {
        throttledProviders.add(acct.provider)
        if (parsed.retryAfterMs) providerRetryAfterMs[acct.provider] = parsed.retryAfterMs
      }
      await supabase
        .from('calendar_accounts')
        .update({ last_error: msg.slice(0, 500) })
        .eq('id', acct.id)
        .eq('user_id', user.id)
    }
  }

  out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const events = out.slice(0, EVENTS_TOTAL_LIMIT)

  // Provider backoff/cooldown:
  // - When throttled, persist a short cooldown window and increase backoff exponent.
  // - On success, reset backoff exponent for that provider.
  const nextBackoff: Record<string, number> = { ...cachedBackoff }
  const nextCooldowns: Record<string, string> = { ...cachedCooldowns }

  const baseDelayMs = 30_000
  const maxDelayMs = 15 * 60_000

  for (const provider of ['google', 'microsoft'] as const) {
    const p = provider as Provider
    if (providerHadSuccess.has(p)) {
      nextBackoff[provider] = 0
      delete nextCooldowns[provider]
      continue
    }

    if (!throttledProviders.has(p)) continue

    const prev = typeof nextBackoff[provider] === 'number' ? nextBackoff[provider] : 0
    const next = Math.min(8, Math.max(0, prev + 1))
    nextBackoff[provider] = next

    const retryAfter = providerRetryAfterMs[p] ?? null
    const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, next))
    const delay = retryAfter != null ? Math.min(maxDelayMs, Math.max(retryAfter, baseDelayMs)) : expDelay
    const smallJitter = (hashStringToInt(`${user.id}:${workflowId}:${provider}:${nowMs}`) % 3_000) + 250
    const untilIso = new Date(nowMs + delay + smallJitter).toISOString()
    nextCooldowns[provider] = untilIso
  }

  // Best-effort cache write (doesn't block returning data if cache write fails).
  await admin
    .from('workflow_calendar_events_cache')
    .upsert(
      {
        user_id: user.id,
        workflow_id: workflowId,
        enabled_account_ids: enabledAccountIds,
        events,
        provider_cooldowns: nextCooldowns,
        provider_backoff: nextBackoff,
        updated_at: nowIso,
      },
      { onConflict: 'user_id,workflow_id' }
    )

  // If every upstream request failed/throttled but we have cached events, prefer serving cached data.
  if (events.length === 0 && cached && Array.isArray(cached.events)) {
    return NextResponse.json({
      ok: true,
      accounts,
      events: cached.events as Array<CalendarEvent & { accountId: string; accountEmail: string; provider: Provider }>,
    } satisfies EventsResponse)
  }

  return NextResponse.json({ ok: true, accounts, events } satisfies EventsResponse)
}


