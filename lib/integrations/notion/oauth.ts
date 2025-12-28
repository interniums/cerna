import 'server-only'

import { getNotionOAuthEnv } from '@/lib/integrations/notion/env'

type NotionTokenResponse = {
  access_token?: string
  token_type?: string
  bot_id?: string
  workspace_id?: string
  workspace_name?: string
  owner?: unknown
}

export async function exchangeNotionCodeForToken(input: { code: string; redirectUri: string }) {
  const { clientId, clientSecret } = getNotionOAuthEnv()
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error('Notion token exchange failed.')
  const data = json as NotionTokenResponse

  const accessToken = typeof data.access_token === 'string' ? data.access_token : ''
  const workspaceId = typeof data.workspace_id === 'string' ? data.workspace_id : ''
  const workspaceName = typeof data.workspace_name === 'string' ? data.workspace_name : null
  if (!accessToken || !workspaceId) throw new Error('Notion token exchange invalid response.')

  return { accessToken, workspaceId, workspaceName }
}


