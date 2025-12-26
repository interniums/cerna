import 'server-only'

export function getMicrosoftOAuthEnv() {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Microsoft OAuth env. Set MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET.')
  }
  return { clientId, clientSecret }
}


