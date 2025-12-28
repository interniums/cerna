import { NextResponse } from 'next/server'

import { getSiteUrl } from '@/lib/site/url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readAndClearOAuthCookies, safeReturnTo } from '@/lib/integrations/oauth-cookies'
import { exchangeSlackCodeForToken } from '@/lib/integrations/slack/oauth'
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
    stateCookie: 'slack_state',
    returnToCookie: 'slack_returnTo',
  })

  const safe = safeReturnTo(returnTo || null)

  if (!code || !state || !expectedState || state !== expectedState) {
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('slack', 'error')
    return NextResponse.redirect(url)
  }

  const redirectUri = `${getSiteUrl()}/api/slack/callback`
  let tokens: Awaited<ReturnType<typeof exchangeSlackCodeForToken>>
  try {
    tokens = await exchangeSlackCodeForToken({ code, redirectUri })
  } catch (error) {
    console.error('[slack callback] token exchange failed', error)
    await logIntegrationError({ userId: user.id, provider: 'slack', stage: 'oauth_exchange', error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('slack', 'error')
    return NextResponse.redirect(url)
  }

  let account
  try {
    account = await upsertIntegrationAccount({
      userId: user.id,
      provider: 'slack',
      externalAccountId: tokens.teamId,
      displayName: tokens.teamName,
      meta: {
        teamId: tokens.teamId,
        teamName: tokens.teamName,
        authedUserId: tokens.authedUserId,
        selectedChannelIds: [],
      },
    })
    integrationAccountId = account.id
  } catch (error) {
    await logIntegrationError({ userId: user.id, provider: 'slack', stage: 'upsert_account', error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('slack', 'error')
    return NextResponse.redirect(url)
  }

  // Slack tokens generally don't expire and do not use refresh tokens.
  try {
    await upsertIntegrationTokens({
      integrationAccountId: account.id,
      accessToken: tokens.accessToken,
      refreshToken: null,
      expiresAt: null,
      scopes: tokens.scopes,
    })
  } catch (error) {
    await logIntegrationError({ userId: user.id, provider: 'slack', stage: 'store_tokens', integrationAccountId, error })
    const url = new URL(safe, getSiteUrl())
    url.searchParams.set('slack', 'error')
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(safe, getSiteUrl()))
}


