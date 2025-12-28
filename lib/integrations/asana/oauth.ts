import 'server-only'

import { getAsanaOAuthEnv } from '@/lib/integrations/asana/env'

type AsanaTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export async function exchangeAsanaCodeForTokens(input: { code: string; redirectUri: string }) {
  const { clientId, clientSecret } = getAsanaOAuthEnv()

  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('redirect_uri', input.redirectUri)
  body.set('code', input.code)

  const res = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Asana token exchange failed.')
  const data = json as AsanaTokenResponse

  if (!data.access_token || typeof data.expires_in !== 'number') throw new Error('Asana token exchange invalid response.')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

export async function refreshAsanaAccessToken(input: { refreshToken: string }) {
  const { clientId, clientSecret } = getAsanaOAuthEnv()

  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('refresh_token', input.refreshToken)

  const res = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Asana token refresh failed.')
  const data = json as AsanaTokenResponse
  if (!data.access_token || typeof data.expires_in !== 'number') throw new Error('Asana token refresh invalid response.')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}


