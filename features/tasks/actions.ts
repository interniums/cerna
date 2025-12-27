'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

import { getServerUser, requireServerUser } from '@/lib/supabase/auth'
import { isBillingEnabled } from '@/lib/billing/mode'
import { createTask, restoreTask, setTaskStatus, softDeleteTask, updateTask } from '@/lib/db/tasks'
import { tasksTag } from '@/lib/cache/tags'
import { recordInstrumentationEvent } from '@/lib/db/instrumentation'

export type TaskActionState = { ok: true; undoTaskId?: string } | { ok: false; message: string }

const tagRevalidateProfile = { expire: 0 } as const

function isMissingColumnError(error: unknown, column: string) {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: unknown; message?: unknown }
  if (typeof maybe.code !== 'string' || typeof maybe.message !== 'string') return false
  return maybe.code === '42703' && maybe.message.toLowerCase().includes(column.toLowerCase())
}

function schemaOutOfDateMessage() {
  return "Your database schema is out of date. Apply Supabase migrations (ensure `tasks.sort_order` exists), then try again."
}

function isRlsOrEntitlementError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: unknown; message?: unknown }
  const msg = typeof maybe.message === 'string' ? maybe.message.toLowerCase() : ''
  const code = typeof maybe.code === 'string' ? maybe.code : ''
  return code === '42501' || msg.includes('row level security') || msg.includes('rls')
}

function entitlementBlockedMessage() {
  return isBillingEnabled()
    ? 'Reordering requires an active subscription.'
    : 'Dev setup: add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server so the app can seed an active entitlement.'
}

const CreateTaskActionSchema = z.object({
  workflowId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().trim().optional(),
  url: z.string().trim().optional(),
  description: z.string().trim().max(4000).optional(),
  primaryResourceId: z.string().uuid().optional(),
  primaryUrl: z.string().trim().optional(),
})

function isoFromDueDateInput(value: string) {
  const cleaned = value.trim()
  if (!cleaned) return undefined
  // Use midday UTC to avoid date shifting across timezones when rendering.
  return new Date(`${cleaned}T12:00:00.000Z`).toISOString()
}

function optionalUrl(value: string | undefined) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return undefined
  return trimmed
}

export async function createTaskAction(_prev: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const parsed = CreateTaskActionSchema.safeParse({
    workflowId: formData.get('workflowId'),
    title: formData.get('title'),
    priority: formData.get('priority') || undefined,
    dueDate: formData.get('dueDate') || undefined,
    url: formData.get('url') || undefined,
    description: formData.get('description') || undefined,
    primaryResourceId: formData.get('primaryResourceId') || undefined,
    primaryUrl: formData.get('primaryUrl') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a task title.' }

  const dueAt = parsed.data.dueDate ? isoFromDueDateInput(parsed.data.dueDate) : undefined
  const url = optionalUrl(parsed.data.url)
  const description = (parsed.data.description ?? '').trim() || undefined
  const primaryUrl = optionalUrl(parsed.data.primaryUrl)
  const primaryResourceId = parsed.data.primaryResourceId
  const priority = parsed.data.priority ?? 'medium'

  if (url) {
    const urlParsed = z.string().url().max(2048).safeParse(url)
    if (!urlParsed.success) return { ok: false, message: 'Enter a valid URL.' }
  }

  if (primaryUrl) {
    const urlParsed = z.string().url().max(2048).safeParse(primaryUrl)
    if (!urlParsed.success) return { ok: false, message: 'Enter a valid app link.' }
  }

  const user = await requireServerUser()

  try {
    // Pick a stable sort order for open tasks. (Done tasks are ordered by completion date.)
    // Note: This is best-effort; concurrent creates can produce duplicates, but ordering will still be stable.
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
    const maxRes = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('user_id', user.id)
      .eq('workflow_id', parsed.data.workflowId)
      .eq('status', 'open')
      .is('deleted_at', null)
      .not('sort_order', 'is', null)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const maxOrder = maxRes.data && typeof (maxRes.data as { sort_order: unknown }).sort_order === 'number' ? (maxRes.data as { sort_order: number }).sort_order : null
    const nextOrder = maxOrder === null ? 1 : maxOrder + 1

    const created = await createTask({
      userId: user.id,
      workflowId: parsed.data.workflowId,
      title: parsed.data.title,
      priority,
      dueAt,
      url,
      description,
      primaryResourceId,
      primaryUrl,
      sortOrder: nextOrder,
    })
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: parsed.data.workflowId,
      name: 'task_created',
      meta: {
        task_id: created.id,
        has_due: Boolean(dueAt),
        has_url: Boolean(url),
        priority,
        has_description: Boolean(description),
        has_primary_app: Boolean(primaryUrl || primaryResourceId),
      },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))
    revalidateTag(tasksTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    if (isMissingColumnError(error, 'tasks.sort_order') || isMissingColumnError(error, 'sort_order')) {
      return { ok: false, message: schemaOutOfDateMessage() }
    }
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

const UpdateTaskActionSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().trim().optional(),
  url: z.string().trim().optional(),
  description: z.string().trim().max(4000).optional(),
  primaryResourceId: z.string().uuid().optional(),
  primaryUrl: z.string().trim().optional(),
})

export async function updateTaskAction(_prev: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const rawPrimaryResourceId = String(formData.get('primaryResourceId') ?? '').trim()

  const parsed = UpdateTaskActionSchema.safeParse({
    taskId: formData.get('taskId'),
    title: formData.get('title'),
    priority: formData.get('priority') || undefined,
    dueDate: formData.get('dueDate') || undefined,
    url: formData.get('url') || undefined,
    description: formData.get('description') || undefined,
    // If the field is present but cleared, treat as "not provided" for schema parsing,
    // and apply nulling below (same result for update).
    primaryResourceId: rawPrimaryResourceId ? rawPrimaryResourceId : undefined,
    primaryUrl: formData.get('primaryUrl') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a task title.' }

  const user = await requireServerUser()

  const dueAt = parsed.data.dueDate ? isoFromDueDateInput(parsed.data.dueDate) : null
  const url = optionalUrl(parsed.data.url) ?? null
  const description = (parsed.data.description ?? '').trim() || null
  const primaryUrl = optionalUrl(parsed.data.primaryUrl) ?? null
  const primaryResourceId = rawPrimaryResourceId ? rawPrimaryResourceId : null
  const priority = parsed.data.priority ?? 'medium'

  if (url) {
    const urlParsed = z.string().url().max(2048).safeParse(url)
    if (!urlParsed.success) return { ok: false, message: 'Enter a valid URL.' }
  }

  if (primaryUrl) {
    const urlParsed = z.string().url().max(2048).safeParse(primaryUrl)
    if (!urlParsed.success) return { ok: false, message: 'Enter a valid app link.' }
  }

  try {
    const updated = await updateTask({
      userId: user.id,
      taskId: parsed.data.taskId,
      title: parsed.data.title,
      priority,
      dueAt,
      url,
      description,
      primaryResourceId,
      primaryUrl,
    })

    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: updated.workflow_id,
      name: 'task_updated',
      meta: { task_id: updated.id },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))

    revalidateTag(tasksTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}

const ToggleTaskActionSchema = z.object({
  taskId: z.string().uuid(),
  nextStatus: z.enum(['open', 'done']),
})

export async function toggleTaskStatusAction(_prev: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const parsed = ToggleTaskActionSchema.safeParse({
    taskId: formData.get('taskId'),
    nextStatus: formData.get('nextStatus'),
  })
  if (!parsed.success) return { ok: false, message: 'Couldn’t update that task.' }

  const user = await requireServerUser()

  try {
    const updated = await setTaskStatus({ userId: user.id, taskId: parsed.data.taskId, status: parsed.data.nextStatus })
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: updated.workflow_id,
      name: updated.status === 'done' ? 'task_completed' : 'task_reopened',
      meta: { task_id: updated.id },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))
    revalidateTag(tasksTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t update. Try again.' }
  }
}

const DeleteTaskActionSchema = z.object({
  taskId: z.string().uuid(),
})

export async function deleteTaskAction(_prev: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const parsed = DeleteTaskActionSchema.safeParse({ taskId: formData.get('taskId') })
  if (!parsed.success) return { ok: false, message: 'Missing task id.' }

  const user = await requireServerUser()

  try {
    const deleted = await softDeleteTask({ userId: user.id, taskId: parsed.data.taskId })
    const workflowId = String(formData.get('workflowId') ?? '').trim()
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId,
      name: 'task_deleted',
      meta: { task_id: deleted.id },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))
    revalidateTag(tasksTag(user.id), tagRevalidateProfile)
    return { ok: true, undoTaskId: parsed.data.taskId }
  } catch {
    return { ok: false, message: 'Couldn’t delete. Try again.' }
  }
}

export async function restoreTaskAction(taskId: string, formData?: FormData) {
  const user = await requireServerUser()
  const restored = await restoreTask({ userId: user.id, taskId })
  const workflowId = String(formData?.get('workflowId') ?? '').trim()
  void recordInstrumentationEvent({
    userId: user.id,
    workflowId,
    name: 'task_restored',
    meta: { task_id: restored.id },
  }).catch((error) => console.error('recordInstrumentationEvent failed', error))
  revalidateTag(tasksTag(user.id), tagRevalidateProfile)
}

const ReorderTasksSchema = z.object({
  workflowId: z.string().uuid(),
  taskIds: z.array(z.string().uuid()).min(1).max(200),
})

export async function reorderTasksAction(input: { workflowId: string; taskIds: string[] }): Promise<TaskActionState> {
  const parsed = ReorderTasksSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Couldn’t reorder tasks.' }

  // Never redirect during background-ish UI interactions like drag + drop.
  // If the session is missing/expired, return a normal error so the client can toast.
  const user = await getServerUser()
  if (!user) return { ok: false, message: 'Your session expired. Reload and try again.' }

  try {
    const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()

    // Validate IDs belong to this workflow/user and aren't deleted (keeps correctness similar to per-row updates).
    const ids = parsed.data.taskIds
    const check = await supabase
      .from('tasks')
      .select('id')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('workflow_id', parsed.data.workflowId)
      .is('deleted_at', null)
    if (check.error) throw check.error

    const allowed = new Set((check.data ?? []).map((r) => r.id as string))
    if (allowed.size !== ids.length) return { ok: false, message: 'Couldn’t reorder some tasks.' }

    // Important: do NOT use upsert here.
    // Upsert is implemented as INSERT ... ON CONFLICT, which triggers INSERT RLS checks and requires
    // all non-null columns. For reorder we only have ids + sort_order, so upsert is brittle under RLS.
    for (let i = 0; i < ids.length; i++) {
      const taskId = ids[i]!
      const nextOrder = i + 1
      const u = await supabase
        .from('tasks')
        .update({ sort_order: nextOrder })
        .eq('id', taskId)
        .eq('user_id', user.id)
        .eq('workflow_id', parsed.data.workflowId)
        .is('deleted_at', null)
      if (u.error) throw u.error
    }

    revalidateTag(tasksTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    if (isMissingColumnError(error, 'tasks.sort_order') || isMissingColumnError(error, 'sort_order')) {
      return { ok: false, message: schemaOutOfDateMessage() }
    }
    if (isRlsOrEntitlementError(error)) {
      console.error('[tasks] reorder blocked by RLS/entitlement', error)
      return { ok: false, message: entitlementBlockedMessage() }
    }
    // Log server-side so it shows up in the Node terminal for debugging.
    console.error('[tasks] reorder failed', { workflowId: parsed.data.workflowId, taskCount: parsed.data.taskIds.length, error })
    return { ok: false, message: 'Couldn’t reorder. Try again.' }
  }
}


