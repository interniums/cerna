import 'server-only'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { essentialsTag, resourceByIdTag, resourcesScopeTag, resourcesTag } from '@/lib/cache/tags'

export type Resource = {
  id: string
  user_id: string
  workflow_id: string
  category_id: string | null
  url: string
  title: string | null
  description: string | null
  favicon_url: string | null
  image_url: string | null
  notes: string | null
  is_pinned: boolean
  pinned_at: string | null
  is_essential: boolean
  essential_at: string | null
  sort_order: number | null
  visit_count: number
  last_visited_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const CreateResourceSchema = z.object({
  workflowId: z.string().uuid(),
  url: z.string().url().max(2048),
  title: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
})

export const UpdateResourceSchema = z.object({
  resourceId: z.string().uuid(),
  url: z.string().url().max(2048).optional(),
  title: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export async function listResources(input: {
  userId: string
  workflowId: string
  scope: 'all' | 'pinned' | 'category'
  categoryId?: string
  limit?: number
  mode?: 'default' | 'recent'
}) {
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()

  const cached = unstable_cache(
    async () => {
      const mode = input.mode ?? 'default'
      let query = supabase
        .from('resources')
        .select('*')
        .eq('user_id', input.userId)
        .eq('workflow_id', input.workflowId)
        .is('deleted_at', null)

      if (input.scope === 'pinned') query = query.eq('is_pinned', true)
      if (input.scope === 'category') query = query.eq('category_id', input.categoryId ?? '')
      if (mode === 'recent') query = query.eq('is_pinned', false)

      // Canonical ordering (keep stable; do NOT include `updated_at`).
      if (mode === 'recent') {
        query = query
          .order('last_visited_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      } else {
        query = query
          .order('is_pinned', { ascending: false })
          .order('pinned_at', { ascending: true, nullsFirst: false })
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('last_visited_at', { ascending: false, nullsFirst: false })
          .order('visit_count', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      }

      const res = await query.limit(input.limit ?? 100)

      if (res.error) throw res.error
      return (res.data ?? []) as Resource[]
    },
    ['listResources', resourcesScopeTag(input)],
    {
      revalidate: 30,
      tags: [resourcesTag(input.userId), resourcesScopeTag(input)],
    }
  )

  return cached()
}

export async function listEssentialsResources(input: { userId: string; workflowId: string; limit?: number }) {
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()
  const limit = input.limit ?? 16

  const cached = unstable_cache(
    async () => {
      const res = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', input.userId)
        .eq('workflow_id', input.workflowId)
        .is('deleted_at', null)
        .eq('is_essential', true)
        // Essentials dock ordering: left→right is the persisted `essential_at` order.
        .order('essential_at', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .limit(limit)

      if (res.error) throw res.error
      return (res.data ?? []) as Resource[]
    },
    ['listEssentialsResources', input.userId, input.workflowId, String(limit)],
    { revalidate: 30, tags: [resourcesTag(input.userId), essentialsTag(input.userId, input.workflowId, limit)] }
  )

  return cached()
}

export async function ensureDefaultEssentials(input: { userId: string; workflowId: string }) {
  const supabase = await createSupabaseServerClient()

  // Seed only for brand-new users (no saved resources).
  const any = await supabase
    .from('resources')
    .select('id')
    .eq('user_id', input.userId)
    .eq('workflow_id', input.workflowId)
    .is('deleted_at', null)
    .limit(1)
  if (any.error) throw any.error
  if ((any.data ?? []).length > 0) return

  const defaults = [
    { title: 'Notion', url: 'https://www.notion.so' },
    { title: 'Gmail', url: 'https://mail.google.com' },
    { title: 'YouTube', url: 'https://www.youtube.com' },
  ] as const

  // Idempotency guard (in case multiple server renders race).
  const existing = await supabase
    .from('resources')
    .select('url')
    .eq('user_id', input.userId)
    .eq('workflow_id', input.workflowId)
    .is('deleted_at', null)
    .in(
      'url',
      defaults.map((d) => d.url)
    )

  if (existing.error) throw existing.error
  const existingUrls = new Set((existing.data ?? []).map((r) => String((r as { url: string }).url)))

  const now = Date.now()
  const toInsert = defaults
    .filter((d) => !existingUrls.has(d.url))
    .map((d, idx) => ({
      user_id: input.userId,
      workflow_id: input.workflowId,
      url: d.url,
      title: d.title,
      notes: null,
      category_id: null,
      is_pinned: false,
      pinned_at: null,
      is_essential: true,
      essential_at: new Date(now + idx * 1000).toISOString(),
    }))

  if (toInsert.length === 0) return

  const inserted = await supabase.from('resources').insert(toInsert)
  if (inserted.error) throw inserted.error
}

export async function createResource(input: {
  userId: string
  workflowId: string
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
      workflow_id: input.workflowId,
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

export async function updateResource(input: {
  userId: string
  resourceId: string
  url?: string
  title?: string
  notes?: string
}) {
  const supabase = await createSupabaseServerClient()

  const patch: Record<string, string | null> = {}
  if (input.url !== undefined) patch.url = input.url || null
  if (input.title !== undefined) patch.title = input.title || null
  if (input.notes !== undefined) patch.notes = input.notes || null
  if (Object.keys(patch).length === 0) return

  const res = await supabase
    .from('resources')
    .update(patch)
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,url,title,notes')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'url' | 'title' | 'notes'>
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
  const nextPinned = !current.data.is_pinned

  const res = await supabase
    .from('resources')
    .update({ is_pinned: nextPinned, pinned_at: nextPinned ? new Date().toISOString() : null })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,is_pinned,pinned_at')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'is_pinned' | 'pinned_at'>
}

export async function toggleEssential(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()
  const current = await supabase
    .from('resources')
    .select('is_essential')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()
  if (current.error) throw current.error

  const nextEssential = !current.data.is_essential

  const res = await supabase
    .from('resources')
    .update({ is_essential: nextEssential, essential_at: nextEssential ? new Date().toISOString() : null })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,is_essential,essential_at')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'is_essential' | 'essential_at'>
}

export async function setPinned(input: { userId: string; resourceId: string; isPinned: boolean }) {
  const supabase = await createSupabaseServerClient()

  const current = await supabase
    .from('resources')
    .select('is_pinned,pinned_at')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()
  if (current.error) throw current.error

  if (current.data.is_pinned === input.isPinned) {
    return {
      id: input.resourceId,
      is_pinned: current.data.is_pinned,
      pinned_at: current.data.pinned_at,
    } as Pick<Resource, 'id' | 'is_pinned' | 'pinned_at'>
  }

  const res = await supabase
    .from('resources')
    .update({
      is_pinned: input.isPinned,
      pinned_at: input.isPinned ? new Date().toISOString() : null,
    })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,is_pinned,pinned_at')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'is_pinned' | 'pinned_at'>
}

export async function setEssential(input: { userId: string; resourceId: string; isEssential: boolean }) {
  const supabase = await createSupabaseServerClient()

  const current = await supabase
    .from('resources')
    .select('is_essential,essential_at')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()
  if (current.error) throw current.error

  if (current.data.is_essential === input.isEssential) {
    return {
      id: input.resourceId,
      is_essential: current.data.is_essential,
      essential_at: current.data.essential_at,
    } as Pick<Resource, 'id' | 'is_essential' | 'essential_at'>
  }

  const res = await supabase
    .from('resources')
    .update({
      is_essential: input.isEssential,
      essential_at: input.isEssential ? new Date().toISOString() : null,
    })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .select('id,is_essential,essential_at')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Resource, 'id' | 'is_essential' | 'essential_at'>
}

export async function addEssential(input: { userId: string; resourceId: string }) {
  return setEssential({ userId: input.userId, resourceId: input.resourceId, isEssential: true })
}

export async function removeEssential(input: { userId: string; resourceId: string }) {
  return setEssential({ userId: input.userId, resourceId: input.resourceId, isEssential: false })
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
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()

  const cached = unstable_cache(
    async () => {
      const res = await supabase
        .from('resources')
        .select('*')
        .eq('id', input.resourceId)
        .eq('user_id', input.userId)
        .single()
      if (res.error) throw res.error
      return res.data as Resource
    },
    ['getResourceById', input.userId, input.resourceId],
    { revalidate: 60, tags: [resourcesTag(input.userId), resourceByIdTag(input.userId, input.resourceId)] }
  )

  return cached()
}
