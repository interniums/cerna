'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { createTask, restoreTask, setTaskStatus, softDeleteTask } from '@/lib/db/tasks'
import { tasksTag } from '@/lib/cache/tags'
import { recordInstrumentationEvent } from '@/lib/db/instrumentation'

export type TaskActionState = { ok: true; undoTaskId?: string } | { ok: false; message: string }

const tagRevalidateProfile = { expire: 0 } as const

const CreateTaskActionSchema = z.object({
  workflowId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueDate: z.string().trim().optional(),
  url: z.string().trim().optional(),
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
    dueDate: formData.get('dueDate') || undefined,
    url: formData.get('url') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a task title.' }

  const dueAt = parsed.data.dueDate ? isoFromDueDateInput(parsed.data.dueDate) : undefined
  const url = optionalUrl(parsed.data.url)

  if (url) {
    const urlParsed = z.string().url().max(2048).safeParse(url)
    if (!urlParsed.success) return { ok: false, message: 'Enter a valid URL.' }
  }

  const user = await requireServerUser()

  try {
    const created = await createTask({ userId: user.id, workflowId: parsed.data.workflowId, title: parsed.data.title, dueAt, url })
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: parsed.data.workflowId,
      name: 'task_created',
      meta: { task_id: created.id, has_due: Boolean(dueAt), has_url: Boolean(url) },
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


