import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto/app-encryption'
import { refreshAccessToken } from '@/lib/integrations/google-calendar/oauth'
import { listUpcomingGoogleEvents, type CalendarEvent } from '@/lib/integrations/google-calendar/events'
import { listCalendarAccounts } from '@/lib/db/calendar'

type EventsResponse =
  | { ok: true; accounts: Array<{ id: string; email: string; displayName: string | null; enabled: boolean; lastError: string | null }>; events: Array<CalendarEvent & { accountId: string; accountEmail: string }> }
  | { ok: false; message: string }

function toUserFacingGoogleCalendarError(error: unknown): string {
  const raw = error instanceof Error ? error.message : ''
  if (!raw) return 'Couldn’t load events.'

  if (raw.includes('insufficient authentication scopes')) {
    return 'Google Calendar permission missing. Reconnect and allow Calendar access.'
  }
  if (raw.includes('Invalid Credentials') || raw.includes('Invalid token')) {
    return 'Google Calendar session expired. Reconnect to continue.'
  }
  if (raw.includes('Google Calendar API has not been used') || raw.includes('it is disabled')) {
    return 'Google Calendar API is disabled for this project. Enable it in Google Cloud Console.'
  }

  // Strip internal prefix if present.
  if (raw.startsWith('[google-calendar] ')) {
    return raw.replace(/^\[google-calendar\]\s*\d+\s*/i, '').slice(0, 500)
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

  const accounts = accountsRes.map((a) => ({
    id: a.id,
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

  // Include events that started recently (useful for "join now" in the first few minutes).
  const nowMs = Date.now()
  const timeMinIso = new Date(nowMs - 10 * 60 * 1000).toISOString()
  const timeMaxIso = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString()

  const out: Array<CalendarEvent & { accountId: string; accountEmail: string }> = []

  for (const acct of enabledAccounts) {
    const tokenRow = await admin
      .from('calendar_account_tokens')
      .select('*')
      .eq('calendar_account_id', acct.id)
      .maybeSingle()
    if (tokenRow.error || !tokenRow.data) {
      continue
    }

    let accessToken = decryptSecret(String((tokenRow.data as { access_token_enc: string }).access_token_enc))
    const refreshToken = decryptSecret(String((tokenRow.data as { refresh_token_enc: string }).refresh_token_enc))
    const expiresAtIso = String((tokenRow.data as { expires_at: string }).expires_at)

    const needsRefresh = Date.parse(expiresAtIso) <= Date.now() + 60_000
    if (needsRefresh) {
      try {
        const refreshed = await refreshAccessToken({ refreshToken })
        accessToken = refreshed.accessToken
        const up = await admin
          .from('calendar_account_tokens')
          .update({ access_token_enc: encryptSecret(refreshed.accessToken), expires_at: refreshed.expiresAt })
          .eq('calendar_account_id', acct.id)
        if (up.error) console.error('[calendar events] token update failed', up.error)
      } catch (error) {
        console.error('[calendar events] refresh failed', error)
        const msg = 'Reconnect required.'
        await supabase.from('calendar_accounts').update({ last_error: msg }).eq('id', acct.id).eq('user_id', user.id)
        continue
      }
    }

    try {
      const events = await listUpcomingGoogleEvents({ accessToken, limit: 3, timeMinIso, timeMaxIso })
      for (const e of events) out.push({ ...e, accountId: acct.id, accountEmail: acct.email })
      // Clear last error on success.
      if (acct.last_error) {
        await supabase.from('calendar_accounts').update({ last_error: null }).eq('id', acct.id).eq('user_id', user.id)
      }
    } catch (error) {
      console.error('[calendar events] list events failed', error)
      const msg = toUserFacingGoogleCalendarError(error)
      await supabase
        .from('calendar_accounts')
        .update({ last_error: msg.slice(0, 500) })
        .eq('id', acct.id)
        .eq('user_id', user.id)
    }
  }

  out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return NextResponse.json({ ok: true, accounts, events: out.slice(0, 3) } satisfies EventsResponse)
}


