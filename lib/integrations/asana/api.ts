import 'server-only'

type AsanaResponse<T> = { data?: T }

async function asanaGet<T>(input: { token: string; path: string; query?: Record<string, string> }) {
  const url = new URL(`https://app.asana.com/api/1.0/${input.path}`)
  for (const [k, v] of Object.entries(input.query ?? {})) url.searchParams.set(k, v)

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${input.token}` },
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') throw new Error(`[asana] ${input.path} failed`)
  return json as AsanaResponse<T>
}

type AsanaWorkspace = { gid?: string; name?: string }
type AsanaUser = { gid?: string; name?: string; email?: string; workspaces?: AsanaWorkspace[] }

export async function fetchAsanaMe(input: { token: string }) {
  const res = await asanaGet<AsanaUser>({ token: input.token, path: 'users/me' })
  const me = res.data ?? {}
  const gid = typeof me.gid === 'string' ? me.gid : ''
  if (!gid) throw new Error('[asana] users/me missing gid')

  const name = typeof me.name === 'string' ? me.name : null
  const email = typeof me.email === 'string' ? me.email : null
  const workspaces = Array.isArray(me.workspaces) ? me.workspaces : []
  const firstWorkspace = workspaces.find((w) => typeof w.gid === 'string' && w.gid) ?? null
  const defaultWorkspaceGid = firstWorkspace && typeof firstWorkspace.gid === 'string' ? firstWorkspace.gid : null

  return { gid, name, email, defaultWorkspaceGid }
}

type AsanaTask = {
  gid?: string
  name?: string
  notes?: string
  completed?: boolean
  due_at?: string | null
  due_on?: string | null
  modified_at?: string
  permalink_url?: string
}

export async function listMyOpenTasks(input: { token: string; workspaceGid: string; limit?: number }) {
  const optFields = ['name', 'notes', 'completed', 'due_at', 'due_on', 'modified_at', 'permalink_url'].join(',')
  const res = await asanaGet<AsanaTask[]>({
    token: input.token,
    path: 'tasks',
    query: {
      assignee: 'me',
      workspace: input.workspaceGid,
      completed_since: 'now',
      limit: String(input.limit ?? 50),
      opt_fields: optFields,
    },
  })

  const data = Array.isArray(res.data) ? res.data : []
  return data
}


