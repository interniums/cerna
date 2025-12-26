import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getSiteUrl } from '@/lib/site/url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getGoogleOAuthEnv } from '@/lib/integrations/google-calendar/env'
import { codeChallengeS256, generateCodeVerifier } from '@/lib/integrations/google-calendar/pkce'

function safeReturnTo(value: string | null) {
  if (!value) return '/app'
  if (value.startsWith('/app')) return value
  return '/app'
}

function randomState() {
  // Short & URL-safe
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

  const { clientId } = getGoogleOAuthEnv()
  const redirectUri = `${getSiteUrl()}/api/google-calendar/callback`

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

  cookieStore.set('gc_state', state, cookieBase)
  cookieStore.set('gc_verifier', codeVerifier, cookieBase)
  cookieStore.set('gc_returnTo', returnTo, cookieBase)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('include_granted_scopes', 'true')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('scope', [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' '))

  return NextResponse.redirect(authUrl)
}


