export function categoriesTag(userId: string) {
  return `categories:${userId}`
}

export function workflowsTag(userId: string) {
  return `workflows:${userId}`
}

export function resourcesTag(userId: string) {
  return `resources:${userId}`
}

export function resourcesScopeTag(input: {
  userId: string
  workflowId: string
  scope: 'all' | 'pinned' | 'category'
  categoryId?: string
  limit?: number
  mode?: 'default' | 'recent'
}) {
  const categoryPart = input.scope === 'category' ? input.categoryId ?? 'missing' : '_'
  const limitPart = input.limit ? String(input.limit) : '_'
  const modePart = input.mode ? input.mode : '_'
  return `resources:${input.userId}:${input.workflowId}:${input.scope}:${categoryPart}:${limitPart}:${modePart}`
}

export function resourceByIdTag(userId: string, resourceId: string) {
  return `resource:${userId}:${resourceId}`
}

export function essentialsTag(userId: string, workflowId: string, limit: number) {
  return `essentials:${userId}:${workflowId}:${limit}`
}

export function tasksTag(userId: string) {
  return `tasks:${userId}`
}

export function tasksScopeTag(input: { userId: string; workflowId: string; scope: 'open' | 'done' | 'all' }) {
  return `tasks:${input.userId}:${input.workflowId}:${input.scope}`
}

export function focusSessionsTag(userId: string) {
  return `focus_sessions:${userId}`
}

export function focusSessionsScopeTag(input: { userId: string; workflowId: string }) {
  return `focus_sessions:${input.userId}:${input.workflowId}`
}


