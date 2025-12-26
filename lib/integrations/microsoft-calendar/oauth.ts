import 'server-only'

import { getMicrosoftOAuthEnv } from '@/lib/integrations/microsoft-calendar/env'

type MicrosoftTokenResponse = {
  token_type?: string
  scope?: string
  expires_in?: number
  access_token?: string
  refresh_token?: string
  id_token?: string
}

export async function exchangeMicrosoftCodeForTokens(input: { code: string; codeVerifier: string; redirectUri: string }) {
  const { clientId, clientSecret } = getMicrosoftOAuthEnv()

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'authorization_code')
  body.set('code', input.code)
  body.set('code_verifier', input.codeVerifier)
  body.set('redirect_uri', input.redirectUri)
  body.set('scope', ['offline_access', 'openid', 'profile', 'email', 'Calendars.Read'].join(' '))

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Microsoft token exchange failed.')
  const data = json as MicrosoftTokenResponse

  if (!data.access_token || typeof data.expires_in !== 'number') throw new Error('Microsoft token exchange invalid response.')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

export async function refreshMicrosoftAccessToken(input: { refreshToken: string }) {
  const { clientId, clientSecret } = getMicrosoftOAuthEnv()

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', input.refreshToken)
  body.set('scope', ['offline_access', 'openid', 'profile', 'email', 'Calendars.Read'].join(' '))

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Microsoft token refresh failed.')
  const data = json as MicrosoftTokenResponse

  if (!data.access_token || typeof data.expires_in !== 'number') throw new Error('Microsoft token refresh invalid response.')

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

type GraphMe = { displayName?: string; mail?: string; userPrincipalName?: string }

export async function fetchMicrosoftMe(input: { accessToken: string }) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
    headers: { authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Failed to fetch Microsoft profile.')
  const data = json as GraphMe
  const email =
    (typeof data.mail === 'string' && data.mail) ||
    (typeof data.userPrincipalName === 'string' && data.userPrincipalName) ||
    ''
  if (!email) throw new Error('Microsoft profile missing email.')
  const displayName = typeof data.displayName === 'string' ? data.displayName : null
  return { email, displayName }
}


