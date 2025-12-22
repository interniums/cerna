'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { CategoryIdSchema, CreateCategorySchema, createCategory, deleteCategory, renameCategory } from '@/lib/db/categories'
import { requireServerUser } from '@/lib/supabase/auth'

export type CategoryActionState = { ok: true } | { ok: false; message: string }

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return null
  if (!('message' in error)) return null
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : null
}

function mapCategoryWriteErrorToMessage(error: unknown): string {
  const message = (getErrorMessage(error) ?? '').toLowerCase()

  // Keep copy short, direct, and safe.
  if (message.includes('duplicate') || message.includes('unique') || message.includes('categories_user_name_unique'))
    return 'That category name is already used.'

  return 'Couldn’t save changes. Try again.'
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const parsed = CreateCategorySchema.safeParse({
    name: formData.get('name'),
  })

  if (!parsed.success) return { ok: false, message: 'Enter a category name.' }

  const user = await requireServerUser()

  try {
    await createCategory(user.id, parsed.data.name)
    revalidatePath('/app')
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t create category. Try again.' }
  }
}

const RenameCategorySchema = z.object({
  categoryId: CategoryIdSchema,
  name: CreateCategorySchema.shape.name,
})

export async function renameCategoryAction(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const parsed = RenameCategorySchema.safeParse({
    categoryId: formData.get('categoryId'),
    name: formData.get('name'),
  })

  if (!parsed.success) return { ok: false, message: 'Enter a category name.' }

  const user = await requireServerUser()

  try {
    await renameCategory({ userId: user.id, categoryId: parsed.data.categoryId, name: parsed.data.name })
    revalidatePath('/app')
    revalidatePath(`/app/category/${parsed.data.categoryId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, message: mapCategoryWriteErrorToMessage(error) }
  }
}

const DeleteCategorySchema = z.object({
  categoryId: CategoryIdSchema,
})

export async function deleteCategoryAction(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const parsed = DeleteCategorySchema.safeParse({
    categoryId: formData.get('categoryId'),
  })

  if (!parsed.success) return { ok: false, message: 'Missing category.' }

  const user = await requireServerUser()

  try {
    await deleteCategory({ userId: user.id, categoryId: parsed.data.categoryId })
    revalidatePath('/app')
    revalidatePath('/app/all')
    revalidatePath(`/app/category/${parsed.data.categoryId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, message: mapCategoryWriteErrorToMessage(error) }
  }
}
