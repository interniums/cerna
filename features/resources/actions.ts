'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  createResource,
  UpdateResourceSchema,
  addEssential,
  restoreResource,
  softDeleteResource,
  setEssential,
  setPinned,
  toggleEssential,
  togglePinned,
  updateResource,
  updateResourceMetadata,
} from '@/lib/db/resources'
import { essentialsTag, resourceByIdTag, resourcesTag } from '@/lib/cache/tags'
import { getServerUser, requireServerUser } from '@/lib/supabase/auth'
import { isBillingEnabled } from '@/lib/billing/mode'
import { indexResourceEmbedding } from '@/lib/search/indexing'
import { fetchUrlMetadata } from '@/lib/metadata/fetch-url-metadata'
import { getDefaultWorkflowId } from '@/lib/db/workflows'
import { z } from 'zod'

export type ResourceActionState =
  | { ok: true; undoResourceId?: string; createdResourceId?: string; createdUrl?: string }
  | { ok: false; message: string }

const tagRevalidateProfile = { expire: 0 } as const
const ESSENTIALS_LIMIT = 16 as const

async function countEssentials(input: { userId: string; workflowId: string }) {
  const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
  const res = await supabase
    .from('resources')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .eq('workflow_id', input.workflowId)
    .is('deleted_at', null)
    .eq('is_essential', true)
  if (res.error) throw res.error
  return res.count ?? 0
}

function isMissingColumnError(error: unknown, column: string) {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: unknown; message?: unknown }
  if (typeof maybe.code !== 'string' || typeof maybe.message !== 'string') return false
  return maybe.code === '42703' && maybe.message.toLowerCase().includes(column.toLowerCase())
}

function schemaOutOfDateMessage(column: string) {
  return `Your database schema is out of date. Apply Supabase migrations (missing \`${column}\`), then try again.`
}

function isRlsOrEntitlementError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: unknown; message?: unknown }
  const msg = typeof maybe.message === 'string' ? maybe.message.toLowerCase() : ''
  const code = typeof maybe.code === 'string' ? maybe.code : ''
  return code === '42501' || msg.includes('row level security') || msg.includes('rls')
}

function entitlementBlockedMessage() {
  // In prod, this means "subscribe". In local/dev it usually means "missing dev setup seed".
  return isBillingEnabled()
    ? 'Reordering requires an active subscription.'
    : 'Dev setup: add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server so the app can seed an active entitlement.'
}

const CreateResourceActionSchema = z.object({
  workflowId: z.string().uuid().optional(),
  url: z.string().url().max(2048),
  title: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
})

async function getWorkflowIdFromFormData(input: { userId: string; formData: FormData }) {
  const raw = input.formData.get('workflowId')
  const candidate = typeof raw === 'string' ? raw.trim() : ''
  if (candidate) return candidate
  return await getDefaultWorkflowId({ userId: input.userId })
}

async function createResourceShared(input: {
  userId: string
  workflowId: string
  url: string
  title?: string
  notes?: string
  categoryId?: string
  makeEssential: boolean
}) {
  const created = await createResource({
    userId: input.userId,
    workflowId: input.workflowId,
    url: input.url,
    title: input.title,
    notes: input.notes,
    categoryId: input.categoryId,
  })

  if (input.makeEssential) {
    await addEssential({ userId: input.userId, resourceId: created.id })
  }

  // Best-effort enrichment (favicon + og:image + description).
  // Keep timeout tight to avoid slowing the save flow.
  // If the user typed a title, we don't override it.
  void fetchUrlMetadata({ url: created.url, timeoutMs: 1500 })
    .then(async (meta) => {
      await updateResourceMetadata({
        userId: input.userId,
        resourceId: created.id,
        title: input.title ? undefined : meta.title,
        description: meta.description,
        faviconUrl: meta.faviconUrl,
        imageUrl: meta.imageUrl,
      })
    })
    .catch(() => null)

  if (process.env.OPENAI_API_KEY) {
    void indexResourceEmbedding({ userId: input.userId, resourceId: created.id }).catch((error) => {
      console.error('indexResourceEmbedding failed', error)
    })
  }

  return created
}

function safeReturnTo(value: string | null) {
  if (!value) return '/app/all'
  if (value.startsWith('/app')) return value
  return '/app/all'
}

export async function createResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const parsed = CreateResourceActionSchema.safeParse({
    workflowId: formData.get('workflowId') || undefined,
    url: formData.get('url'),
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
    categoryId: formData.get('categoryId') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a valid URL.' }

  const user = await requireServerUser()
  const workflowId = parsed.data.workflowId ?? (await getWorkflowIdFromFormData({ userId: user.id, formData }))

  try {
    const created = await createResourceShared({
      userId: user.id,
      workflowId,
      url: parsed.data.url,
      title: parsed.data.title,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
      makeEssential: false,
    })

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    return { ok: true, createdResourceId: created.id, createdUrl: created.url }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function createEssentialResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const parsed = CreateResourceActionSchema.safeParse({
    workflowId: formData.get('workflowId') || undefined,
    url: formData.get('url'),
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
    categoryId: formData.get('categoryId') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a valid URL.' }

  const user = await requireServerUser()
  const workflowId = parsed.data.workflowId ?? (await getWorkflowIdFromFormData({ userId: user.id, formData }))

  try {
    const existing = await countEssentials({ userId: user.id, workflowId })
    if (existing >= ESSENTIALS_LIMIT) {
      return { ok: false, message: `Essentials is full (${ESSENTIALS_LIMIT}). Remove one to add another.` }
    }

    const created = await createResourceShared({
      userId: user.id,
      workflowId,
      url: parsed.data.url,
      title: parsed.data.title,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
      makeEssential: true,
    })

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    revalidateTag(resourceByIdTag(user.id, created.id), tagRevalidateProfile)
    revalidateTag(essentialsTag(user.id, workflowId, ESSENTIALS_LIMIT), tagRevalidateProfile)
    return { ok: true, createdResourceId: created.id, createdUrl: created.url }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function updateResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const urlRaw = formData.get('url')
  const titleRaw = formData.get('title')
  const notesRaw = formData.get('notes')
  const isPinned = Boolean(formData.get('isPinned'))
  const isEssential = Boolean(formData.get('isEssential'))

  const parsed = UpdateResourceSchema.safeParse({
    resourceId: formData.get('resourceId'),
    url: typeof urlRaw === 'string' ? urlRaw.trim() : undefined,
    // Important: keep empty strings so users can clear fields.
    title: typeof titleRaw === 'string' ? titleRaw : undefined,
    notes: typeof notesRaw === 'string' ? notesRaw : undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Check the fields and try again.' }

  const user = await requireServerUser()

  try {
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
    const current = await supabase
      .from('resources')
      .select('workflow_id,is_essential,url')
      .eq('id', parsed.data.resourceId)
      .eq('user_id', user.id)
      .single()
    if (current.error) throw current.error

    const workflowId = String((current.data as { workflow_id: string }).workflow_id)
    const wasEssential = Boolean((current.data as { is_essential: boolean }).is_essential)
    const previousUrl = String((current.data as { url: string }).url)

    // Avoid confusing UX where the toggle "works" but the dock can't show it.
    if (!wasEssential && isEssential) {
      const existing = await countEssentials({ userId: user.id, workflowId })
      if (existing >= ESSENTIALS_LIMIT) {
        return { ok: false, message: `Essentials is full (${ESSENTIALS_LIMIT}). Remove one to add another.` }
      }
    }

    await updateResource({
      userId: user.id,
      resourceId: parsed.data.resourceId,
      url: parsed.data.url,
      title: parsed.data.title,
      notes: parsed.data.notes,
    })

    await setPinned({ userId: user.id, resourceId: parsed.data.resourceId, isPinned })
    await setEssential({ userId: user.id, resourceId: parsed.data.resourceId, isEssential })

    // Best-effort enrichment when URL changes (favicon + og:image + description).
    // Keep timeout tight to avoid slowing the save flow.
    if (parsed.data.url && parsed.data.url !== previousUrl) {
      void fetchUrlMetadata({ url: parsed.data.url, timeoutMs: 1500 })
        .then(async (meta) => {
          await updateResourceMetadata({
            userId: user.id,
            resourceId: parsed.data.resourceId,
            description: meta.description,
            faviconUrl: meta.faviconUrl,
            imageUrl: meta.imageUrl,
          })
        })
        .catch(() => null)
    }

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    revalidateTag(resourceByIdTag(user.id, parsed.data.resourceId), tagRevalidateProfile)
    revalidateTag(essentialsTag(user.id, workflowId, ESSENTIALS_LIMIT), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    if (error && typeof error === 'object') {
      const maybe = error as { code?: unknown }
      if (maybe.code === '23505') {
        return { ok: false, message: 'That URL is already saved.' }
      }
    }
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function togglePinnedAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await togglePinned({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
}

export async function togglePinnedStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()
  await togglePinned({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
  return { ok: true }
}

export async function toggleEssentialAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await toggleEssential({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
  // Note: Essentials list caches also depend on `resourcesTag(...)`, so this revalidation is sufficient.
}

export async function toggleEssentialStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()

  try {
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
    const current = await supabase
      .from('resources')
      .select('workflow_id,is_essential')
      .eq('id', resourceId)
      .eq('user_id', user.id)
      .single()
    if (current.error) throw current.error

    const workflowId = String((current.data as { workflow_id: string }).workflow_id)
    const isEssential = Boolean((current.data as { is_essential: boolean }).is_essential)

    // Avoid confusing UX where the toggle "works" but the dock can't show it.
    if (!isEssential) {
      const existing = await countEssentials({ userId: user.id, workflowId })
      if (existing >= ESSENTIALS_LIMIT) {
        return { ok: false, message: `Essentials is full (${ESSENTIALS_LIMIT}). Remove one to add another.` }
      }
    }

    await toggleEssential({ userId: user.id, resourceId })
    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
    revalidateTag(essentialsTag(user.id, workflowId, ESSENTIALS_LIMIT), tagRevalidateProfile)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t update. Try again.' }
  }
}

export async function addEssentialStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  if (!workflowId) return { ok: false, message: 'Missing workflow id.' }

  const ids = formData
    .getAll('resourceId')
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)

  if (ids.length === 0) return { ok: false, message: 'Select at least one resource.' }

  try {
    const existing = await countEssentials({ userId: user.id, workflowId })
    const remaining = Math.max(0, ESSENTIALS_LIMIT - existing)
    if (remaining <= 0) {
      return { ok: false, message: `Essentials is full (${ESSENTIALS_LIMIT}). Remove one to add another.` }
    }
    if (ids.length > remaining) {
      return { ok: false, message: `You can add up to ${remaining} more.` }
    }

    for (const resourceId of ids) {
      await addEssential({ userId: user.id, resourceId })
      revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
    }
    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    revalidateTag(essentialsTag(user.id, workflowId, ESSENTIALS_LIMIT), tagRevalidateProfile)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t update. Try again.' }
  }
}

export async function confirmDeleteResourceAction(resourceId: string, returnTo?: string) {
  const user = await requireServerUser()
  await softDeleteResource({ userId: user.id, resourceId })

  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)

  const target = safeReturnTo(returnTo ?? null)
  const url = new URL(target, 'http://internal')
  url.searchParams.set('undo', resourceId)
  redirect(url.pathname + url.search)
}

export async function deleteResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()
  await softDeleteResource({ userId: user.id, resourceId })

  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)

  return { ok: true, undoResourceId: resourceId }
}

export async function restoreResourceAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await restoreResource({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
}

const ReorderResourcesSchema = z.object({
  workflowId: z.string().uuid(),
  resourceIds: z.array(z.string().uuid()).min(1).max(500),
})

export async function reorderResourcesAction(input: { workflowId: string; resourceIds: string[] }): Promise<ResourceActionState> {
  const parsed = ReorderResourcesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Couldn’t reorder.' }

  // Never redirect during background-ish UI interactions like drag + drop.
  // If the session is missing/expired, return a normal error so the client can toast.
  const user = await getServerUser()
  if (!user) return { ok: false, message: 'Your session expired. Reload and try again.' }

  try {
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
    const ids = parsed.data.resourceIds

    const check = await supabase
      .from('resources')
      .select('id,is_pinned')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('workflow_id', parsed.data.workflowId)
      .is('deleted_at', null)
    if (check.error) throw check.error

    const rows = (check.data ?? []) as Array<{ id: string; is_pinned: boolean }>
    if (rows.length !== ids.length) return { ok: false, message: 'Couldn’t reorder some items.' }
    if (rows.some((r) => r.is_pinned)) return { ok: false, message: 'Pinned resources can’t be reordered here.' }

    // Important: do NOT use upsert here.
    // Upsert is implemented as INSERT ... ON CONFLICT, which triggers INSERT RLS checks and requires
    // all non-null columns. For reorder we only have ids + sort_order, so upsert is brittle under RLS.
    for (let i = 0; i < ids.length; i++) {
      const resourceId = ids[i]!
      const nextOrder = i + 1
      const u = await supabase
        .from('resources')
        .update({ sort_order: nextOrder })
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .eq('workflow_id', parsed.data.workflowId)
        .is('deleted_at', null)
        .eq('is_pinned', false)
      if (u.error) throw u.error
    }

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    if (isMissingColumnError(error, 'resources.sort_order') || isMissingColumnError(error, 'sort_order')) {
      return { ok: false, message: schemaOutOfDateMessage('resources.sort_order') }
    }
    if (isRlsOrEntitlementError(error)) {
      console.error('[resources] reorder blocked by RLS/entitlement', error)
      return { ok: false, message: entitlementBlockedMessage() }
    }
    console.error('[resources] reorder failed', error)
    return { ok: false, message: 'Couldn’t reorder. Try again.' }
  }
}

const ReorderPinnedResourcesSchema = z.object({
  workflowId: z.string().uuid(),
  resourceIds: z.array(z.string().uuid()).min(1).max(200),
})

export async function reorderPinnedResourcesAction(input: { workflowId: string; resourceIds: string[] }): Promise<ResourceActionState> {
  const parsed = ReorderPinnedResourcesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Couldn’t reorder.' }

  // Never redirect during background-ish UI interactions like drag + drop.
  // If the session is missing/expired, return a normal error so the client can toast.
  const user = await getServerUser()
  if (!user) return { ok: false, message: 'Your session expired. Reload and try again.' }

  try {
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
    const ids = parsed.data.resourceIds

    const check = await supabase
      .from('resources')
      .select('id,is_pinned')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('workflow_id', parsed.data.workflowId)
      .is('deleted_at', null)
      .eq('is_pinned', true)
    if (check.error) throw check.error

    const rows = (check.data ?? []) as Array<{ id: string; is_pinned: boolean }>
    if (rows.length !== ids.length) return { ok: false, message: 'Couldn’t reorder some items.' }

    // `listResources` orders pinned by `pinned_at` ascending, so write chronological times to match the desired order.
    const now = Date.now()
    const start = now - (ids.length - 1) * 1000
    for (let i = 0; i < ids.length; i++) {
      const resourceId = ids[i]!
      const nextPinnedAt = new Date(start + i * 1000).toISOString()
      const u = await supabase
        .from('resources')
        .update({ pinned_at: nextPinnedAt })
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .eq('workflow_id', parsed.data.workflowId)
        .is('deleted_at', null)
        .eq('is_pinned', true)
      if (u.error) throw u.error
    }

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    if (isMissingColumnError(error, 'resources.pinned_at') || isMissingColumnError(error, 'pinned_at')) {
      return { ok: false, message: schemaOutOfDateMessage('resources.pinned_at') }
    }
    if (isRlsOrEntitlementError(error)) {
      console.error('[resources] reorder pinned blocked by RLS/entitlement', error)
      return { ok: false, message: entitlementBlockedMessage() }
    }
    console.error('[resources] reorder pinned failed', error)
    return { ok: false, message: 'Couldn’t reorder. Try again.' }
  }
}

const ReorderEssentialsSchema = z.object({
  workflowId: z.string().uuid(),
  resourceIds: z.array(z.string().uuid()).min(1).max(64),
})

export async function reorderEssentialsAction(input: { workflowId: string; resourceIds: string[] }): Promise<ResourceActionState> {
  const parsed = ReorderEssentialsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Couldn’t reorder.' }

  // Never redirect during background-ish UI interactions like drag + drop.
  // If the session is missing/expired, return a normal error so the client can toast.
  const user = await getServerUser()
  if (!user) return { ok: false, message: 'Your session expired. Reload and try again.' }

  try {
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
    const ids = parsed.data.resourceIds

    const check = await supabase
      .from('resources')
      .select('id,is_pinned,is_essential')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('workflow_id', parsed.data.workflowId)
      .is('deleted_at', null)
      .eq('is_essential', true)
    if (check.error) throw check.error

    const rows = (check.data ?? []) as Array<{ id: string; is_pinned: boolean; is_essential: boolean }>
    if (rows.length !== ids.length) return { ok: false, message: 'Couldn’t reorder some items.' }

    const now = Date.now()
    const start = now - (ids.length - 1) * 1000
    for (let i = 0; i < ids.length; i++) {
      const resourceId = ids[i]!
      const nextEssentialAt = new Date(start + i * 1000).toISOString()
      const u = await supabase
        .from('resources')
        .update({ essential_at: nextEssentialAt })
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .eq('workflow_id', parsed.data.workflowId)
        .is('deleted_at', null)
        .eq('is_essential', true)
      if (u.error) throw u.error
    }

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    revalidateTag(essentialsTag(user.id, parsed.data.workflowId, 16), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    if (isMissingColumnError(error, 'resources.essential_at') || isMissingColumnError(error, 'essential_at')) {
      return { ok: false, message: schemaOutOfDateMessage('resources.essential_at') }
    }
    if (isRlsOrEntitlementError(error)) {
      console.error('[resources] reorder essentials blocked by RLS/entitlement', error)
      return { ok: false, message: entitlementBlockedMessage() }
    }
    console.error('[resources] reorder essentials failed', error)
    return { ok: false, message: 'Couldn’t reorder. Try again.' }
  }
}
