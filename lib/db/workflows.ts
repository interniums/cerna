import 'server-only'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { workflowsTag } from '@/lib/cache/tags'

export type WorkflowTheme = 'work' | 'side' | 'learning'

export type Workflow = {
  id: string
  user_id: string
  name: string
  theme: WorkflowTheme
  sort_order: number
  created_at: string
}

export const CreateWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(64),
  theme: z.enum(['work', 'side', 'learning']).optional(),
})

export const WorkflowIdSchema = z.string().uuid()

export async function listWorkflows(userId: string) {
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()

  const cached = unstable_cache(
    async () => {
      const res = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })

      if (res.error) throw res.error
      return (res.data ?? []) as Workflow[]
    },
    ['listWorkflows', userId],
    { revalidate: 60, tags: [workflowsTag(userId)] }
  )

  return cached()
}

export async function getWorkflowById(input: { userId: string; workflowId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('workflows')
    .select('*')
    .eq('id', input.workflowId)
    .eq('user_id', input.userId)
    .single()

  if (res.error) throw res.error
  return res.data as Workflow
}

export async function ensureDefaultWorkflows(input: { userId: string }) {
  const supabase = await createSupabaseServerClient()

  const any = await supabase.from('workflows').select('id').eq('user_id', input.userId).limit(1)
  if (any.error) throw any.error
  if ((any.data ?? []).length > 0) return

  const inserted = await supabase.from('workflows').insert({
    user_id: input.userId,
    name: 'Work',
    theme: 'work',
    sort_order: 0,
  })
  if (inserted.error) throw inserted.error
}

export async function getDefaultWorkflowId(input: { userId: string }) {
  await ensureDefaultWorkflows({ userId: input.userId })
  const workflows = await listWorkflows(input.userId)
  const first = workflows[0]
  if (!first) throw new Error('Missing default workflow.')
  return first.id
}

export async function createWorkflow(input: { userId: string; name: string; theme?: WorkflowTheme }) {
  const supabase = await createSupabaseServerClient()

  const max = await supabase
    .from('workflows')
    .select('sort_order')
    .eq('user_id', input.userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (max.error) throw max.error
  const nextSort = typeof max.data?.sort_order === 'number' ? max.data.sort_order + 1 : 0

  const res = await supabase
    .from('workflows')
    .insert({
      user_id: input.userId,
      name: input.name,
      theme: input.theme ?? 'work',
      sort_order: nextSort,
    })
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as Workflow
}

export async function renameWorkflow(input: { userId: string; workflowId: string; name: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('workflows')
    .update({ name: input.name })
    .eq('id', input.workflowId)
    .eq('user_id', input.userId)
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as Workflow
}

export async function deleteWorkflow(input: { userId: string; workflowId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('workflows').delete().eq('id', input.workflowId).eq('user_id', input.userId)
  if (res.error) throw res.error
}


