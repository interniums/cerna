import 'server-only'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { tasksScopeTag, tasksTag } from '@/lib/cache/tags'

export type TaskStatus = 'open' | 'done'

export type Task = {
  id: string
  user_id: string
  workflow_id: string
  title: string
  status: TaskStatus
  due_at: string | null
  url: string | null
  completed_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const TaskIdSchema = z.string().uuid()

export const CreateTaskSchema = z.object({
  workflowId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime().optional(),
  url: z.string().url().max(2048).optional(),
})

export const UpdateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  url: z.string().url().max(2048).nullable().optional(),
})

export async function listTasks(input: { userId: string; workflowId: string; scope: 'open' | 'done' | 'all' }) {
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()

  const cached = unstable_cache(
    async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', input.userId)
        .eq('workflow_id', input.workflowId)
        .is('deleted_at', null)

      if (input.scope === 'open') query = query.eq('status', 'open')
      if (input.scope === 'done') query = query.eq('status', 'done')

      if (input.scope === 'done') {
        query = query.order('completed_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
      } else {
        query = query
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      }

      const res = await query.limit(200)
      if (res.error) throw res.error
      return (res.data ?? []) as Task[]
    },
    ['listTasks', tasksScopeTag(input)],
    { revalidate: 30, tags: [tasksTag(input.userId), tasksScopeTag(input)] }
  )

  return cached()
}

export async function createTask(input: { userId: string; workflowId: string; title: string; dueAt?: string; url?: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('tasks')
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      title: input.title,
      due_at: input.dueAt ?? null,
      url: input.url ?? null,
    })
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as Task
}

export async function setTaskStatus(input: { userId: string; taskId: string; status: TaskStatus }) {
  const supabase = await createSupabaseServerClient()
  const patch: Record<string, string | null> = {
    status: input.status,
    completed_at: input.status === 'done' ? new Date().toISOString() : null,
  }

  const res = await supabase.from('tasks').update(patch).eq('id', input.taskId).eq('user_id', input.userId).select('*').single()
  if (res.error) throw res.error
  return res.data as Task
}

export async function softDeleteTask(input: { userId: string; taskId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.taskId)
    .eq('user_id', input.userId)
    .select('id,deleted_at')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Task, 'id' | 'deleted_at'>
}

export async function restoreTask(input: { userId: string; taskId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('tasks')
    .update({ deleted_at: null })
    .eq('id', input.taskId)
    .eq('user_id', input.userId)
    .select('id,deleted_at')
    .single()

  if (res.error) throw res.error
  return res.data as Pick<Task, 'id' | 'deleted_at'>
}

function startOfTodayUtcIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString()
}

function endOfTodayUtcIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString()
}

export async function listMorningBriefingTasks(input: { userId: string; workflowId: string }) {
  const supabase = await createSupabaseServerClient()
  const nowIso = new Date().toISOString()
  const startIso = startOfTodayUtcIso()
  const endIso = endOfTodayUtcIso()

  const base = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', input.userId)
    .eq('workflow_id', input.workflowId)
    .is('deleted_at', null)
    .eq('status', 'open')

  const [overdueRes, todayRes, noDueRes] = await Promise.all([
    base.not('due_at', 'is', null).lt('due_at', nowIso).order('due_at', { ascending: true, nullsFirst: false }).limit(8),
    base
      .not('due_at', 'is', null)
      .gte('due_at', startIso)
      .lte('due_at', endIso)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(12),
    base.is('due_at', null).order('created_at', { ascending: false }).order('id', { ascending: true }).limit(8),
  ])

  if (overdueRes.error) throw overdueRes.error
  if (todayRes.error) throw todayRes.error
  if (noDueRes.error) throw noDueRes.error

  return {
    overdue: (overdueRes.data ?? []) as Task[],
    today: (todayRes.data ?? []) as Task[],
    noDue: (noDueRes.data ?? []) as Task[],
  }
}


