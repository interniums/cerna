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
