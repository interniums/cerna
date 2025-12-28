import 'server-only'

import { getSlackOAuthEnv } from '@/lib/integrations/slack/env'

type SlackOAuthAccessResponse = {
  ok?: boolean
  error?: string
  access_token?: string
  token_type?: string
  scope?: string
  team?: { id?: string; name?: string }
  authed_user?: { id?: string }
}

export async function exchangeSlackCodeForToken(input: { code: string; redirectUri: string }) {
  const { clientId, clientSecret } = getSlackOAuthEnv()

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('code', input.code)
  body.set('redirect_uri', input.redirectUri)

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Slack token exchange failed.')

  const data = json as SlackOAuthAccessResponse
  if (!data.ok || !data.access_token || typeof data.access_token !== 'string') {
    const msg = typeof data.error === 'string' && data.error ? data.error : 'Slack token exchange failed.'
    throw new Error(msg)
  }

  const teamId = typeof data.team?.id === 'string' ? data.team.id : ''
  if (!teamId) throw new Error('Slack OAuth response missing team id.')

  const teamName = typeof data.team?.name === 'string' ? data.team.name : null
  const authedUserId = typeof data.authed_user?.id === 'string' ? data.authed_user.id : null
  const scope = typeof data.scope === 'string' ? data.scope : ''
  const scopes = scope
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    accessToken: data.access_token,
    teamId,
    teamName,
    authedUserId,
    scopes,
  }
}


