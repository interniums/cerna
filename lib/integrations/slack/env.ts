import 'server-only'

export function getSlackOAuthEnv() {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing Slack OAuth env. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.')
  }
  return { clientId, clientSecret }
}


