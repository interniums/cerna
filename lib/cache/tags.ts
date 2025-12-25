export function categoriesTag(userId: string) {
  return `categories:${userId}`
}

export function resourcesTag(userId: string) {
  return `resources:${userId}`
}

export function resourcesScopeTag(input: {
  userId: string
  scope: 'all' | 'pinned' | 'category'
  categoryId?: string
  limit?: number
}) {
  const categoryPart = input.scope === 'category' ? input.categoryId ?? 'missing' : '_'
  const limitPart = input.limit ? String(input.limit) : '_'
  return `resources:${input.userId}:${input.scope}:${categoryPart}:${limitPart}`
}

export function resourceByIdTag(userId: string, resourceId: string) {
  return `resource:${userId}:${resourceId}`
}

export function essentialsTag(userId: string, limit: number) {
  return `essentials:${userId}:${limit}`
}


