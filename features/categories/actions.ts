'use server'

import { revalidatePath } from 'next/cache'

import { CreateCategorySchema, createCategory } from '@/lib/db/categories'
import { requireServerUser } from '@/lib/supabase/auth'

export type CategoryActionState = { ok: true } | { ok: false; message: string }

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
