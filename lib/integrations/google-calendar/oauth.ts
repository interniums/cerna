import 'server-only'

import { getGoogleOAuthEnv } from '@/lib/integrations/google-calendar/env'

type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  scope?: string
  token_type: string
  refresh_token?: string
  id_token?: string
}

export async function exchangeCodeForTokens(input: {
  code: string
  codeVerifier: string
  redirectUri: string
}) {
  const { clientId, clientSecret } = getGoogleOAuthEnv()

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'authorization_code')
  body.set('code', input.code)
  body.set('code_verifier', input.codeVerifier)
  body.set('redirect_uri', input.redirectUri)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') {
    throw new Error('Google token exchange failed.')
  }

  const data = json as Partial<GoogleTokenResponse>
  if (!data.access_token || !data.token_type || typeof data.expires_in !== 'number') {
    throw new Error('Google token exchange returned an invalid response.')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

export async function refreshAccessToken(input: { refreshToken: string }) {
  const { clientId, clientSecret } = getGoogleOAuthEnv()

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', input.refreshToken)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') {
    throw new Error('Google token refresh failed.')
  }

  const data = json as Partial<GoogleTokenResponse>
  if (!data.access_token || typeof data.expires_in !== 'number') {
    throw new Error('Google token refresh returned an invalid response.')
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

type GoogleUserInfo = { email?: string; name?: string }

export async function fetchGoogleUserInfo(input: { accessToken: string }) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Failed to fetch Google user info.')
  const data = json as GoogleUserInfo
  const email = typeof data.email === 'string' ? data.email : ''
  const name = typeof data.name === 'string' ? data.name : null
  if (!email) throw new Error('Google user info missing email.')
  return { email, name }
}


