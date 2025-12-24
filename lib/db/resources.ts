import 'server-only'

import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type Resource = {
  id: string
  user_id: string
  category_id: string | null
  url: string
  title: string | null
  description: string | null
  favicon_url: string | null
  image_url: string | null
  notes: string | null
  is_pinned: boolean
  is_favorite: boolean
  visit_count: number
  last_visited_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const CreateResourceSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
})

export async function listResources(input: {
  userId: string
  scope: 'all' | 'pinned' | 'category'
  categoryId?: string
  limit?: number
}) {
  const supabase = await createSupabaseServerClient()

  let query = supabase.from('resources').select('*').eq('user_id', input.userId).is('deleted_at', null)

  if (input.scope === 'pinned') query = query.eq('is_pinned', true)
  if (input.scope === 'category') query = query.eq('category_id', input.categoryId ?? '')

  const res = await query
    .order('is_pinned', { ascending: false })
    .order('last_visited_at', { ascending: false, nullsFirst: false })
    .order('visit_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(input.limit ?? 100)

  if (res.error) throw res.error
  const rows = (res.data ?? []) as Resource[]

  // Keep pinned resources stable: older pinned items should stay above newer pinned items.
  // We don't currently track a `pinned_at`, so `created_at` is our best stable proxy.
  const pinned: Resource[] = []
  const unpinned: Resource[] = []
  for (const r of rows) (r.is_pinned ? pinned : unpinned).push(r)

  if (pinned.length > 1) {
    pinned.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  return [...pinned, ...unpinned]
}

export async function createResource(input: {
  userId: string
  url: string
  title?: string
  notes?: string
  categoryId?: string
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('resources')
    .insert({
      user_id: input.userId,
      url: input.url,
      title: input.title ?? null,
      notes: input.notes ?? null,
      category_id: input.categoryId ?? null,
    })
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as Resource
}

export async function updateResourceMetadata(input: {
  userId: string
  resourceId: string
  title?: string
  description?: string
  faviconUrl?: string
  imageUrl?: string
}) {
  const supabase = await createSupabaseServerClient()

  const patch: Record<string, string | null> = {}
  if (input.title !== undefined) patch.title = input.title || null
  if (input.description !== undefined) patch.description = input.description || null
  if (input.faviconUrl !== undefined) patch.favicon_url = input.faviconUrl || null
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl || null

  if (Object.keys(patch).length === 0) return

  const res = await supabase.from('resources').update(patch).eq('id', input.resourceId).eq('user_id', input.userId)

  if (res.error) throw res.error
}

export async function togglePinned(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()
  const current = await supabase
    .from('resources')
    .select('is_pinned')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()
  if (current.error) throw current.error

  const res = await supabase
    .from('resources')
    .update({ is_pinned: !current.data.is_pinned })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,is_pinned')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'is_pinned'>
}

export async function toggleFavorite(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()
  const current = await supabase
    .from('resources')
    .select('is_favorite')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()
  if (current.error) throw current.error

  const res = await supabase
    .from('resources')
    .update({ is_favorite: !current.data.is_favorite })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,is_favorite')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'is_favorite'>
}

export async function softDeleteResource(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('resources')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,deleted_at')
    .single()
  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'deleted_at'>
}

export async function restoreResource(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('resources')
    .update({ deleted_at: null })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,deleted_at')
    .single()
  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'deleted_at'>
}

export async function getResourceById(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('resources')
    .select('*')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()
  if (res.error) throw res.error
  return res.data as Resource
}
