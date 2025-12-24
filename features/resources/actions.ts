'use server'

import { revalidatePath } from 'next/cache'

import {
  CreateResourceSchema,
  createResource,
  restoreResource,
  softDeleteResource,
  toggleFavorite,
  togglePinned,
  updateResourceMetadata,
} from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { indexResourceEmbedding } from '@/lib/search/indexing'
import { fetchUrlMetadata } from '@/lib/metadata/fetch-url-metadata'

export type ResourceActionState = { ok: true; undoResourceId?: string } | { ok: false; message: string }

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
    revalidatePath('/app')
    revalidatePath('/app/all')
    revalidatePath('/app/pinned')
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

export async function togglePinnedAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await togglePinned({ userId: user.id, resourceId })
  revalidatePath('/app')
  revalidatePath('/app/pinned')
  revalidatePath('/app/all')
}

export async function toggleFavoriteAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await toggleFavorite({ userId: user.id, resourceId })
  revalidatePath('/app')
  revalidatePath('/app/all')
  revalidatePath('/app/pinned')
}

export async function deleteResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const resourceId = String(formData.get('resourceId') ?? '')
  if (!resourceId) return { ok: false, message: 'Missing resource id.' }

  const user = await requireServerUser()
  await softDeleteResource({ userId: user.id, resourceId })

  revalidatePath('/app')
  revalidatePath('/app/all')
  revalidatePath('/app/pinned')

  return { ok: true, undoResourceId: resourceId }
}

export async function restoreResourceAction(resourceId: string, _formData?: FormData) {
  void _formData
  const user = await requireServerUser()
  await restoreResource({ userId: user.id, resourceId })
  revalidatePath('/app')
  revalidatePath('/app/all')
  revalidatePath('/app/pinned')
}
