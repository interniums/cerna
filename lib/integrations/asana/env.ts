import 'server-only'

export function getAsanaOAuthEnv() {
  const clientId = process.env.ASANA_CLIENT_ID
  const clientSecret = process.env.ASANA_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Asana OAuth env. Set ASANA_CLIENT_ID and ASANA_CLIENT_SECRET.')
  }
  return { clientId, clientSecret }
}


