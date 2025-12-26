'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import {
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
import { getDefaultWorkflowId } from '@/lib/db/workflows'
import { z } from 'zod'

export type ResourceActionState = { ok: true; undoResourceId?: string } | { ok: false; message: string }

const tagRevalidateProfile = { expire: 0 } as const

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
    await createResourceShared({
      userId: user.id,
      workflowId,
      url: parsed.data.url,
      title: parsed.data.title,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
      makeEssential: false,
    })

    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    return { ok: true }
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
    // Essentials dock uses a fixed limit (16).
    revalidateTag(essentialsTag(user.id, workflowId, 16), tagRevalidateProfile)
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
    revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
    revalidateTag(resourceByIdTag(user.id, parsed.data.resourceId), tagRevalidateProfile)
    return { ok: true }
  } catch {
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
  await toggleEssential({ userId: user.id, resourceId })
  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
  return { ok: true }
}

export async function addEssentialStateAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const user = await requireServerUser()

  const ids = formData
    .getAll('resourceId')
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)

  if (ids.length === 0) return { ok: false, message: 'Select at least one resource.' }

  for (const resourceId of ids) {
    await addEssential({ userId: user.id, resourceId })
    revalidateTag(resourceByIdTag(user.id, resourceId), tagRevalidateProfile)
  }
  revalidateTag(resourcesTag(user.id), tagRevalidateProfile)
  return { ok: true }
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
