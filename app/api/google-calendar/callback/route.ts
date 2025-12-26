import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getSiteUrl } from '@/lib/site/url'
import { exchangeCodeForTokens, fetchGoogleUserInfo } from '@/lib/integrations/google-calendar/oauth'
import { encryptSecret } from '@/lib/crypto/app-encryption'
import { upsertCalendarAccount, upsertWorkflowCalendarVisibility } from '@/lib/db/calendar'
import { listWorkflows } from '@/lib/db/workflows'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safeReturnTo(value: string | null) {
  if (!value) return '/app'
  if (value.startsWith('/app')) return value
  return '/app'
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const userRes = await supabase.auth.getUser()
  if (userRes.error || !userRes.data.user) {
    return NextResponse.redirect(new URL('/login?error=callback', getSiteUrl()))
  }
  const user = userRes.data.user

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  const cookieStore = await cookies()
  const expectedState = cookieStore.get('gc_state')?.value ?? ''
  const codeVerifier = cookieStore.get('gc_verifier')?.value ?? ''
  const returnTo = safeReturnTo(cookieStore.get('gc_returnTo')?.value ?? null)

  // Clear cookies ASAP (avoid repeated attempts on refresh).
  cookieStore.set('gc_state', '', { path: '/', maxAge: 0 })
  cookieStore.set('gc_verifier', '', { path: '/', maxAge: 0 })
  cookieStore.set('gc_returnTo', '', { path: '/', maxAge: 0 })

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    const url = new URL(returnTo, getSiteUrl())
    url.searchParams.set('calendar', 'error')
    return NextResponse.redirect(url)
  }

  const redirectUri = `${getSiteUrl()}/api/google-calendar/callback`
  const tokens = await exchangeCodeForTokens({ code, codeVerifier, redirectUri })

  if (!tokens.refreshToken) {
    // Without a refresh token we can't reliably keep the integration alive.
    const url = new URL(returnTo, getSiteUrl())
    url.searchParams.set('calendar', 'missing_refresh_token')
    return NextResponse.redirect(url)
  }

  const profile = await fetchGoogleUserInfo({ accessToken: tokens.accessToken })

  // Upsert account (RLS-protected; user owns the row).
  const account = await upsertCalendarAccount({
    userId: user.id,
    provider: 'google',
    email: profile.email,
    displayName: profile.name,
  })

  // Default visibility: enabled for all workflows.
  const workflows = await listWorkflows(user.id)
  for (const w of workflows) {
    await upsertWorkflowCalendarVisibility({ workflowId: w.id, calendarAccountId: account.id, enabled: true })
  }

  // Store tokens via service role (tokens table has RLS enabled with no select policies).
  const admin = createSupabaseAdminClient()
  const upsertTokens = await admin.from('calendar_account_tokens').upsert(
    {
      calendar_account_id: account.id,
      access_token_enc: encryptSecret(tokens.accessToken),
      refresh_token_enc: encryptSecret(tokens.refreshToken),
      expires_at: tokens.expiresAt,
    },
    { onConflict: 'calendar_account_id' }
  )
  if (upsertTokens.error) {
    console.error('[google-calendar callback] token upsert failed', upsertTokens.error)
    // Still redirect to app; the widget will show a reconnect error.
  }

  return NextResponse.redirect(new URL(returnTo, getSiteUrl()))
}


