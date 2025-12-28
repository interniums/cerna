import 'server-only'

const NOTION_VERSION = '2022-06-28'

type NotionSearchResult = {
  object?: string
  id?: string
  url?: string
  last_edited_time?: string
  created_time?: string
  properties?: unknown
  title?: unknown
}

async function notionFetch(input: { token: string; path: string; body?: unknown }) {
  const res = await fetch(`https://api.notion.com/v1/${input.path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.token}`,
      'content-type': 'application/json',
      'notion-version': NOTION_VERSION,
    },
    body: JSON.stringify(input.body ?? {}),
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error(`[notion] ${input.path} failed`)
  return json as Record<string, unknown>
}

export async function searchNotion(input: { token: string; pageSize?: number }) {
  const json = await notionFetch({
    token: input.token,
    path: 'search',
    body: {
      page_size: input.pageSize ?? 25,
      sort: { timestamp: 'last_edited_time', direction: 'descending' },
    },
  })

  const results = Array.isArray(json.results) ? (json.results as NotionSearchResult[]) : []
  return results
}


