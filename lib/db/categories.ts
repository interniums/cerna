import 'server-only'

import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type Category = {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(64),
})

export const CategoryIdSchema = z.string().uuid()

export async function listCategories(userId: string) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (res.error) throw res.error
  return (res.data ?? []) as Category[]
}

export async function createCategory(userId: string, name: string) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('categories').insert({ user_id: userId, name }).select('*').single()

  if (res.error) throw res.error
  return res.data as Category
}

export async function renameCategory(input: { userId: string; categoryId: string; name: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('categories')
    .update({ name: input.name })
    .eq('id', input.categoryId)
    .eq('user_id', input.userId)
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as Category
}

export async function deleteCategory(input: { userId: string; categoryId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('categories').delete().eq('id', input.categoryId).eq('user_id', input.userId)

  if (res.error) throw res.error
}
