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

  const admin = createSupabaseAdminClient()

  const now = new Date()
  const timeMinIso = now.toISOString()
  const timeMaxIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const out: Array<CalendarEvent & { accountId: string; accountEmail: string; provider: Provider }> = []

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
          ? await listUpcomingGoogleEvents({ accessToken: refreshed.accessToken, limit: 3, timeMinIso, timeMaxIso })
          : await listUpcomingMicrosoftEvents({ accessToken: refreshed.accessToken, limit: 3, timeMinIso, timeMaxIso })

      for (const e of events) out.push({ ...e, accountId: acct.id, accountEmail: acct.email, provider: acct.provider })

      if (acct.last_error) {
        await supabase.from('calendar_accounts').update({ last_error: null }).eq('id', acct.id).eq('user_id', user.id)
      }
    } catch (error) {
      console.error('[calendar events] list events failed', { provider: acct.provider, error })
      await supabase.from('calendar_accounts').update({ last_error: 'Couldn’t load events.' }).eq('id', acct.id).eq('user_id', user.id)
    }
  }

  out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return NextResponse.json({ ok: true, accounts, events: out.slice(0, 3) } satisfies EventsResponse)
}


