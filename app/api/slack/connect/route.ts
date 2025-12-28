import { NextResponse } from 'next/server'

import { getSiteUrl } from '@/lib/site/url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSlackOAuthEnv } from '@/lib/integrations/slack/env'
import { safeReturnTo, setOAuthCookies } from '@/lib/integrations/oauth-cookies'

function randomState() {
  // Short & URL-safe
  return crypto.randomUUID()
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

  const { clientId } = getSlackOAuthEnv()
  const redirectUri = `${getSiteUrl()}/api/slack/callback`

  const state = randomState()
  await setOAuthCookies({
    stateCookie: 'slack_state',
    returnToCookie: 'slack_returnTo',
    state,
    returnTo,
  })

  // Slack scopes: start minimal for V1 (read + search). Add more later as needed.
  const scope = [
    'channels:read',
    'channels:history',
    'users:read',
    'users:read.email',
    'team:read',
    'search:read',
  ].join(',')

  const authUrl = new URL('https://slack.com/oauth/v2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', scope)

  return NextResponse.redirect(authUrl)
}


