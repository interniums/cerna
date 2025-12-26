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
  mode?: 'default' | 'recent'
}) {
  const categoryPart = input.scope === 'category' ? input.categoryId ?? 'missing' : '_'
  const limitPart = input.limit ? String(input.limit) : '_'
  const modePart = input.mode ? input.mode : '_'
  return `resources:${input.userId}:${input.scope}:${categoryPart}:${limitPart}:${modePart}`
}

export function resourceByIdTag(userId: string, resourceId: string) {
  return `resource:${userId}:${resourceId}`
}

export function essentialsTag(userId: string, limit: number) {
  return `essentials:${userId}:${limit}`
}


