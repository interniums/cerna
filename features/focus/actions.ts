'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { endFocusSession, startFocusSession } from '@/lib/db/focus-sessions'
import { focusSessionsTag } from '@/lib/cache/tags'
import { getLatestInstrumentationEvent, recordInstrumentationEvent } from '@/lib/db/instrumentation'

export type FocusActionState = { ok: true; sessionId?: string } | { ok: false; message: string }

const tagRevalidateProfile = { expire: 0 } as const

const StartActionSchema = z.object({
  workflowId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
})

export async function startFocusSessionAction(_prev: FocusActionState, formData: FormData): Promise<FocusActionState> {
  const parsed = StartActionSchema.safeParse({
    workflowId: formData.get('workflowId'),
    taskId: formData.get('taskId') || undefined,
  })
  if (!parsed.success) return { ok: false, message: 'Couldn’t start focus.' }

  const user = await requireServerUser()

  try {
    const anchor = await getLatestInstrumentationEvent({
      userId: user.id,
      workflowId: parsed.data.workflowId,
      names: ['view_command_center', 'view_morning'],
    }).catch(() => null)

    const nowMs = Date.now()
    const anchorMs = anchor?.created_at ? Date.parse(anchor.created_at) : NaN
    const deltaS =
      Number.isFinite(anchorMs) && nowMs >= anchorMs ? Math.floor((nowMs - anchorMs) / 1000) : null
    const timeToFocusS = typeof deltaS === 'number' && deltaS >= 0 && deltaS <= 6 * 60 * 60 ? deltaS : null

    const created = await startFocusSession({ userId: user.id, workflowId: parsed.data.workflowId, taskId: parsed.data.taskId })
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: parsed.data.workflowId,
      name: 'focus_started',
      meta: {
        session_id: created.id,
        task_id: parsed.data.taskId ?? null,
        time_to_focus_s: timeToFocusS,
        time_to_focus_from: anchor?.name ?? null,
      },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))
    revalidateTag(focusSessionsTag(user.id), tagRevalidateProfile)
    return { ok: true, sessionId: created.id }
  } catch {
    return { ok: false, message: 'Couldn’t start focus. Try again.' }
  }
}

const EndActionSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['completed', 'cancelled']),
})

export async function endFocusSessionAction(_prev: FocusActionState, formData: FormData): Promise<FocusActionState> {
  const parsed = EndActionSchema.safeParse({
    sessionId: formData.get('sessionId'),
    status: formData.get('status'),
  })
  if (!parsed.success) return { ok: false, message: 'Couldn’t save focus session.' }

  const user = await requireServerUser()

  try {
    const ended = await endFocusSession({ userId: user.id, sessionId: parsed.data.sessionId, status: parsed.data.status })
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: ended.workflow_id,
      name: ended.status === 'completed' ? 'focus_completed' : 'focus_cancelled',
      meta: { session_id: ended.id, duration_s: ended.duration_s, task_id: ended.task_id },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))
    revalidateTag(focusSessionsTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.' }
  }
}


