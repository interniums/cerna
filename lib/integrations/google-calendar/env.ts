import 'server-only'

export function getGoogleOAuthEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth env. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.')
  }
  return { clientId, clientSecret }
}


