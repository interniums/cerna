import { NextResponse } from 'next/server'

import { getSiteUrl } from '@/lib/site/url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readAndClearOAuthCookies, safeReturnTo } from '@/lib/integrations/oauth-cookies'
import { exchangeAsanaCodeForTokens } from '@/lib/integrations/asana/oauth'
import { fetchAsanaMe } from '@/lib/integrations/asana/api'
import { upsertIntegrationAccount } from '@/lib/db/integrations'
import { upsertIntegrationTokens } from '@/lib/integrations/tokens'
import { logIntegrationError } from '@/lib/integrations/error-logging'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const userRes = await supabase.auth.getUser()
  if (userRes.error || !userRes.data.user) {
    return NextResponse.redirect(new URL('/login?error=callback', getSiteUrl()))
  }
  const user = userRes.data.user
  let integrationAccountId: string | null = null

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  const { expectedState, returnTo } = await readAndClearOAuthCookies({
    stateCookie: 'asana_state',
    returnToCookie: 'asana_returnTo',
  })

  const safe = safeReturnTo(returnTo || null)

  if (!code || !state || !expectedState || state !== expectedState) {
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('asana', 'error')
    return NextResponse.redirect(url)
  }

  const redirectUri = `${getSiteUrl()}/api/asana/callback`
  let tokens: Awaited<ReturnType<typeof exchangeAsanaCodeForTokens>>
  try {
    tokens = await exchangeAsanaCodeForTokens({ code, redirectUri })
  } catch (error) {
    console.error('[asana callback] token exchange failed', error)
    await logIntegrationError({ userId: user.id, provider: 'asana', stage: 'oauth_exchange', error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('asana', 'error')
    return NextResponse.redirect(url)
  }

  let me: Awaited<ReturnType<typeof fetchAsanaMe>>
  try {
    me = await fetchAsanaMe({ token: tokens.accessToken })
  } catch (error) {
    console.error('[asana callback] me fetch failed', error)
    await logIntegrationError({ userId: user.id, provider: 'asana', stage: 'fetch_me', error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('asana', 'error')
    return NextResponse.redirect(url)
  }

  let account
  try {
    account = await upsertIntegrationAccount({
      userId: user.id,
      provider: 'asana',
      externalAccountId: me.gid,
      displayName: me.name,
      meta: { email: me.email, defaultWorkspaceGid: me.defaultWorkspaceGid },
    })
    integrationAccountId = account.id
  } catch (error) {
    await logIntegrationError({ userId: user.id, provider: 'asana', stage: 'upsert_account', error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('asana', 'error')
    return NextResponse.redirect(url)
  }

  try {
    await upsertIntegrationTokens({
      integrationAccountId: account.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: [],
    })
  } catch (error) {
    await logIntegrationError({ userId: user.id, provider: 'asana', stage: 'store_tokens', integrationAccountId, error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('asana', 'error')
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(safe, getSiteUrl()))
}


