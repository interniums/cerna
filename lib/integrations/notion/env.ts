import 'server-only'

export function getNotionOAuthEnv() {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Notion OAuth env. Set NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_CLIENT_SECRET.')
  }
  return { clientId, clientSecret }
}


