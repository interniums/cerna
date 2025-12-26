import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getSiteUrl } from '@/lib/site/url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getMicrosoftOAuthEnv } from '@/lib/integrations/microsoft-calendar/env'
import { codeChallengeS256, generateCodeVerifier } from '@/lib/integrations/google-calendar/pkce'

function safeReturnTo(value: string | null) {
  if (!value) return '/app'
  if (value.startsWith('/app')) return value
  return '/app'
}

function randomState() {
  return generateCodeVerifier()
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const userRes = await supabase.auth.getUser()
  if (userRes.error || !userRes.data.user) {
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(requestUrl.pathname + requestUrl.search)}`, getSiteUrl()))
  }

  const requestUrl = new URL(request.url)
  const returnTo = safeReturnTo(requestUrl.searchParams.get('returnTo'))

  const { clientId } = getMicrosoftOAuthEnv()
  const redirectUri = `${getSiteUrl()}/api/microsoft-calendar/callback`

  const state = randomState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = codeChallengeS256(codeVerifier)

  const cookieStore = await cookies()
  const cookieBase = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  }

  cookieStore.set('ms_state', state, cookieBase)
  cookieStore.set('ms_verifier', codeVerifier, cookieBase)
  cookieStore.set('ms_returnTo', returnTo, cookieBase)

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('response_mode', 'query')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('prompt', 'select_account')
  authUrl.searchParams.set('scope', ['offline_access', 'openid', 'profile', 'email', 'Calendars.Read'].join(' '))

  return NextResponse.redirect(authUrl)
}


