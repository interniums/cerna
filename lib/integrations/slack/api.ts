import 'server-only'

type SlackApiResponse<T> = { ok?: boolean; error?: string } & T

async function slackApi<T>(input: { token: string; method: string; query?: Record<string, string> }) {
  const url = new URL(`https://slack.com/api/${input.method}`)
  for (const [k, v] of Object.entries(input.query ?? {})) url.searchParams.set(k, v)

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${input.token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error(`[slack] ${input.method} failed`)

  const data = json as SlackApiResponse<T>
  if (!data.ok) {
    const msg = typeof data.error === 'string' && data.error ? data.error : 'Slack request failed.'
    throw new Error(`[slack] ${input.method}: ${msg}`)
  }

  return data
}

type SlackSearchMessagesMatch = {
  type?: string
  text?: string
  ts?: string
  permalink?: string
  user?: string
  username?: string
  channel?: { id?: string; name?: string }
}

export async function searchMessages(input: {
  token: string
  query: string
  count?: number
  sort?: 'timestamp' | 'score'
  sortDir?: 'asc' | 'desc'
}) {
  const res = await slackApi<{ messages?: { matches?: unknown } }>({
    token: input.token,
    method: 'search.messages',
    query: {
      query: input.query,
      count: String(input.count ?? 50),
      sort: input.sort ?? 'timestamp',
      sort_dir: input.sortDir ?? 'desc',
    },
  })

  const matches = Array.isArray(res.messages?.matches) ? (res.messages?.matches as SlackSearchMessagesMatch[]) : []
  return matches
}


