import 'server-only'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type Note = {
  id: string
  user_id: string
  workflow_id: string
  title: string
  body: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const CreateNoteSchema = z.object({
  workflowId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20000).optional(),
})

export const UpdateNoteSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().max(20000).nullable().optional(),
})

export async function listNotes(input: { userId: string; workflowId: string; q?: string; limit?: number }) {
  const supabase = await createSupabaseServerClient()

  const cached = unstable_cache(
    async () => {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', input.userId)
        .eq('workflow_id', input.workflowId)
        .is('deleted_at', null)

      if (input.q && input.q.trim()) {
        // Simple keyword search (fast enough for V1). Later: full-text + embeddings.
        const q = input.q.trim()
        query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`)
      }

      const res = await query.order('updated_at', { ascending: false }).order('created_at', { ascending: false }).limit(input.limit ?? 100)
      if (res.error) throw res.error
      return (res.data ?? []) as Note[]
    },
    ['listNotes', input.userId, input.workflowId, input.q ?? '', String(input.limit ?? 100)],
    { revalidate: 30 }
  )

  return cached()
}

export async function getNoteById(input: { userId: string; noteId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('notes')
    .select('*')
    .eq('id', input.noteId)
    .eq('user_id', input.userId)
    .is('deleted_at', null)
    .single()
  if (res.error) throw res.error
  return res.data as Note
}

export async function createNote(input: { userId: string; workflowId: string; title: string; body?: string }) {
  const parsed = CreateNoteSchema.safeParse({ workflowId: input.workflowId, title: input.title, body: input.body })
  if (!parsed.success) throw new Error('Invalid createNote input')

  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('notes')
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
    })
    .select('*')
    .single()
  if (res.error) throw res.error
  return res.data as Note
}

export async function updateNote(input: { userId: string; noteId: string; title?: string; body?: string | null }) {
  const parsed = UpdateNoteSchema.safeParse({ noteId: input.noteId, title: input.title, body: input.body })
  if (!parsed.success) throw new Error('Invalid updateNote input')

  const patch: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) patch.title = parsed.data.title
  if (parsed.data.body !== undefined) patch.body = parsed.data.body
  if (Object.keys(patch).length === 0) return null

  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('notes').update(patch).eq('id', input.noteId).eq('user_id', input.userId).select('*').single()
  if (res.error) throw res.error
  return res.data as Note
}

export async function softDeleteNote(input: { userId: string; noteId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.noteId)
    .eq('user_id', input.userId)
    .select('id,deleted_at')
    .single()
  if (res.error) throw res.error
  return res.data as Pick<Note, 'id' | 'deleted_at'>
}


