import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site/url'
import { encryptSecret } from '@/lib/crypto/app-encryption'
import { exchangeMicrosoftCodeForTokens, fetchMicrosoftMe } from '@/lib/integrations/microsoft-calendar/oauth'
import { upsertCalendarAccount, upsertWorkflowCalendarVisibility } from '@/lib/db/calendar'
import { listWorkflows } from '@/lib/db/workflows'

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
  const expectedState = cookieStore.get('ms_state')?.value ?? ''
  const codeVerifier = cookieStore.get('ms_verifier')?.value ?? ''
  const returnTo = safeReturnTo(cookieStore.get('ms_returnTo')?.value ?? null)

  cookieStore.set('ms_state', '', { path: '/', maxAge: 0 })
  cookieStore.set('ms_verifier', '', { path: '/', maxAge: 0 })
  cookieStore.set('ms_returnTo', '', { path: '/', maxAge: 0 })

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    const url = new URL(returnTo, getSiteUrl())
    url.searchParams.set('calendar', 'error')
    return NextResponse.redirect(url)
  }

  const redirectUri = `${getSiteUrl()}/api/microsoft-calendar/callback`
  let tokens
  try {
    tokens = await exchangeMicrosoftCodeForTokens({ code, codeVerifier, redirectUri })
  } catch (error) {
    console.error('[microsoft-calendar callback] token exchange failed', error)
    const url = new URL(returnTo, getSiteUrl())
    url.searchParams.set('calendar', 'error')
    return NextResponse.redirect(url)
  }

  if (!tokens.refreshToken) {
    const url = new URL(returnTo, getSiteUrl())
    url.searchParams.set('calendar', 'missing_refresh_token')
    return NextResponse.redirect(url)
  }

  const me = await fetchMicrosoftMe({ accessToken: tokens.accessToken })

  const account = await upsertCalendarAccount({
    userId: user.id,
    provider: 'microsoft',
    email: me.email,
    displayName: me.displayName,
  })

  const workflows = await listWorkflows(user.id)
  for (const w of workflows) {
    await upsertWorkflowCalendarVisibility({ workflowId: w.id, calendarAccountId: account.id, enabled: true })
  }

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
    console.error('[microsoft-calendar callback] token upsert failed', upsertTokens.error)
  }

  return NextResponse.redirect(new URL(returnTo, getSiteUrl()))
}


