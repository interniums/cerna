import 'server-only'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { tasksScopeTag, tasksTag } from '@/lib/cache/tags'

export type TaskStatus = 'open' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  user_id: string
  workflow_id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  url: string | null
  description: string | null
  primary_resource_id: string | null
  primary_url: string | null
  primary_resource?: {
    id: string
    url: string
    title: string | null
    favicon_url: string | null
  } | null
  sort_order: number | null
  completed_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const TaskIdSchema = z.string().uuid()

export const CreateTaskSchema = z.object({
  workflowId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueAt: z.string().datetime().optional(),
  url: z.string().url().max(2048).optional(),
  description: z.string().max(4000).optional(),
  primaryResourceId: z.string().uuid().optional(),
  primaryUrl: z.string().url().max(2048).optional(),
  sortOrder: z.number().int().optional(),
})

export const UpdateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  url: z.string().url().max(2048).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  primaryResourceId: z.string().uuid().nullable().optional(),
  primaryUrl: z.string().url().max(2048).nullable().optional(),
  sortOrder: z.number().int().nullable().optional(),
})

export async function listTasks(input: { userId: string; workflowId: string; scope: 'open' | 'done' | 'all' }) {
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()

  function throwIfSchemaOutOfDate(error: unknown) {
    if (!error || typeof error !== 'object') return
    const maybe = error as { code?: unknown; message?: unknown }
    if (typeof maybe.code !== 'string' || typeof maybe.message !== 'string') return
    if (maybe.code !== '42703') return
    if (!maybe.message.toLowerCase().includes('sort_order')) return
    throw new Error('Database schema out of date: missing `tasks.sort_order`. Apply Supabase migrations, then retry.')
  }

  const cached = unstable_cache(
    async () => {
      let query = supabase
        .from('tasks')
        .select('*, primary_resource:resources(id,url,title,favicon_url)')
        .eq('user_id', input.userId)
        .eq('workflow_id', input.workflowId)
        .is('deleted_at', null)

      if (input.scope === 'open') query = query.eq('status', 'open')
      if (input.scope === 'done') query = query.eq('status', 'done')

      if (input.scope === 'done') {
        query = query
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('completed_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
      } else {
        query = query
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      }

      const res = await query.limit(200)
      if (res.error) {
        throwIfSchemaOutOfDate(res.error)
        throw res.error
      }
      return (res.data ?? []) as Task[]
    },
    ['listTasks', tasksScopeTag(input)],
    { revalidate: 30, tags: [tasksTag(input.userId), tasksScopeTag(input)] }
  )

  return cached()
}

export async function createTask(input: {
  userId: string
  workflowId: string
  title: string
  dueAt?: string
  url?: string
  priority?: TaskPriority
  description?: string
  primaryResourceId?: string
  primaryUrl?: string
  sortOrder?: number
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('tasks')
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      title: input.title,
      priority: input.priority ?? 'medium',
      due_at: input.dueAt ?? null,
      url: input.url ?? null,
      description: input.description ?? null,
      primary_resource_id: input.primaryResourceId ?? null,
      primary_url: input.primaryUrl ?? null,
      sort_order: input.sortOrder ?? null,
    })
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as Task
}

export async function updateTask(input: {
  userId: string
  taskId: string
  title?: string
  priority?: TaskPriority
  dueAt?: string | null
  url?: string | null
  description?: string | null
  primaryResourceId?: string | null
  primaryUrl?: string | null
  sortOrder?: number | null
}) {
  const parsed = UpdateTaskSchema.safeParse({
    taskId: input.taskId,
    title: input.title,
    priority: input.priority,
    dueAt: input.dueAt,
    url: input.url,
    description: input.description,
    primaryResourceId: input.primaryResourceId,
    primaryUrl: input.primaryUrl,
    sortOrder: input.sortOrder,
  })

  if (!parsed.success) throw new Error('Invalid updateTask input')

  const patch: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) patch.title = parsed.data.title
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority
  if (parsed.data.dueAt !== undefined) patch.due_at = parsed.data.dueAt
  if (parsed.data.url !== undefined) patch.url = parsed.data.url
  if (parsed.data.description !== undefined) patch.description = parsed.data.description
  if (parsed.data.primaryResourceId !== undefined) patch.primary_resource_id = parsed.data.primaryResourceId
  if (parsed.data.primaryUrl !== undefined) patch.primary_url = parsed.data.primaryUrl
  if (parsed.data.sortOrder !== undefined) patch.sort_order = parsed.data.sortOrder

  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', parsed.data.taskId)
    .eq('user_id', input.userId)
    .is('deleted_at', null)
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


