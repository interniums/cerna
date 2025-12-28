import { NextResponse } from 'next/server'

import { getSiteUrl } from '@/lib/site/url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getNotionOAuthEnv } from '@/lib/integrations/notion/env'
import { safeReturnTo, setOAuthCookies } from '@/lib/integrations/oauth-cookies'

function randomState() {
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

  const { clientId } = getNotionOAuthEnv()
  const redirectUri = `${getSiteUrl()}/api/notion/callback`

  const state = randomState()
  await setOAuthCookies({
    stateCookie: 'notion_state',
    returnToCookie: 'notion_returnTo',
    state,
    returnTo,
  })

  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authUrl.searchParams.set('owner', 'user')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl)
}


