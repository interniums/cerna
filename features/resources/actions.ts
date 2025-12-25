'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  CreateResourceSchema,
  createResource,
  UpdateResourceSchema,
  addEssential,
  restoreResource,
  softDeleteResource,
  toggleEssential,
  togglePinned,
  updateResource,
  updateResourceMetadata,
} from '@/lib/db/resources'
import { essentialsTag, resourceByIdTag, resourcesTag } from '@/lib/cache/tags'
import { requireServerUser } from '@/lib/supabase/auth'
import { indexResourceEmbedding } from '@/lib/search/indexing'
import { fetchUrlMetadata } from '@/lib/metadata/fetch-url-metadata'

export type ResourceActionState = { ok: true; undoResourceId?: string } | { ok: false; message: string }

function safeReturnTo(value: string | null) {
  if (!value) return '/app/all'
  if (value.startsWith('/app')) return value
  return '/app/all'
}

export async function createResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const parsed = CreateResourceSchema.safeParse({
    url: formData.get('url'),
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
    categoryId: formData.get('categoryId') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a valid URL.' }

  const user = await requireServerUser()

  try {
    const created = await createResource({
      userId: user.id,
      url: parsed.data.url,
      title: parsed.data.title,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
    })

    // Best-effort enrichment (favicon + og:image + description).
    // Keep timeout tight to avoid slowing the save flow.
    // If the user typed a title, we don't override it.
    void fetchUrlMetadata({ url: created.url, timeoutMs: 1500 })
      .then(async (meta) => {
        await updateResourceMetadata({
          userId: user.id,
          resourceId: created.id,
          title: parsed.data.title ? undefined : meta.title,
          description: meta.description,
          faviconUrl: meta.faviconUrl,
          imageUrl: meta.imageUrl,
        })
      })
      .catch(() => null)

    if (process.env.OPENAI_API_KEY) {
      void indexResourceEmbedding({ userId: user.id, resourceId: created.id }).catch((error) => {
        console.error('indexResourceEmbedding failed', error)
      })
    }
    revalidateTag(resourcesTag(user.id))
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function createEssentialResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const parsed = CreateResourceSchema.safeParse({
    url: formData.get('url'),
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
    categoryId: formData.get('categoryId') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a valid URL.' }

  const user = await requireServerUser()

  try {
    const created = await createResource({
      userId: user.id,
      url: parsed.data.url,
      title: parsed.data.title,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
    })

    await addEssential({ userId: user.id, resourceId: created.id })

    // Best-effort enrichment (favicon + og:image + description).
    // Keep timeout tight to avoid slowing the save flow.
    // If the user typed a title, we don't override it.
    void fetchUrlMetadata({ url: created.url, timeoutMs: 1500 })
      .then(async (meta) => {
        await updateResourceMetadata({
          userId: user.id,
          resourceId: created.id,
          title: parsed.data.title ? undefined : meta.title,
          description: meta.description,
          faviconUrl: meta.faviconUrl,
          imageUrl: meta.imageUrl,
        })
      })
      .catch(() => null)

    if (process.env.OPENAI_API_KEY) {
      void indexResourceEmbedding({ userId: user.id, resourceId: created.id }).catch((error) => {
        console.error('indexResourceEmbedding failed', error)
      })
    }

    revalidateTag(resourcesTag(user.id))
    revalidateTag(resourceByIdTag(user.id, created.id))
    revalidateTag(essentialsTag(user.id, 16))
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function updateResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const titleRaw = formData.get('title')
  const notesRaw = formData.get('notes')

  const parsed = UpdateResourceSchema.safeParse({
    resourceId: formData.get('resourceId'),
    // Important: keep empty strings so users can clear fields.
    title: typeof titleRaw === 'string' ? titleRaw : undefined,
    notes: typeof notesRaw === 'string' ? notesRaw : undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Check the fields and try again.' }

  const user = await requireServerUser()

  try {
    await updateResource({
      userId: user.id,
      resourceId: parsed.data.resourceId,
      title: parsed.data.title,
      notes: parsed.data.notes,
    })
    revalidateTag(resourcesTag(user.id))
    revalidateTag(resourceByIdTag(user.id, parsed.data.resourceId))
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function togglePinnedAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await togglePinned({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))
}

export async function togglePinnedStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()
  await togglePinned({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))
  return { ok: true }
}

export async function toggleEssentialAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await toggleEssential({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))
  // Essentials dock uses a fixed limit (16).
  revalidateTag(essentialsTag(user.id, 16))
}

export async function toggleEssentialStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()
  await toggleEssential({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))
  revalidateTag(essentialsTag(user.id, 16))
  return { ok: true }
}

export async function addEssentialStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()
  await addEssential({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))
  revalidateTag(essentialsTag(user.id, 16))
  return { ok: true }
}

export async function confirmDeleteResourceAction(resourceId: string, returnTo?: string) {
  const user = await requireServerUser()
  await softDeleteResource({ userId: user.id, resourceId })

  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))

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

  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))

  return { ok: true, undoResourceId: resourceId }
}

export async function restoreResourceAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await restoreResource({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id))
  revalidateTag(resourceByIdTag(user.id, resourceId))
}
