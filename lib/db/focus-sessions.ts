import 'server-only'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { focusSessionsScopeTag, focusSessionsTag } from '@/lib/cache/tags'

export type FocusSessionStatus = 'active' | 'completed' | 'cancelled'

export type FocusSession = {
  id: string
  user_id: string
  workflow_id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  duration_s: number
  status: FocusSessionStatus
  created_at: string
  updated_at: string
}

export const FocusSessionIdSchema = z.string().uuid()

export const StartFocusSessionSchema = z.object({
  workflowId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
})

export const EndFocusSessionSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['completed', 'cancelled']).optional(),
  endedAt: z.string().datetime().optional(),
})

export async function listFocusSessions(input: { userId: string; workflowId: string; limit?: number }) {
  // NOTE: Supabase server client reads auth cookies. Next.js forbids accessing dynamic sources
  // (like `cookies()`) inside `unstable_cache`, so we must create the client outside the cache scope.
  const supabase = await createSupabaseServerClient()
  const limit = input.limit ?? 50

  const cached = unstable_cache(
    async () => {
      const res = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', input.userId)
        .eq('workflow_id', input.workflowId)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (res.error) throw res.error
      return (res.data ?? []) as FocusSession[]
    },
    ['listFocusSessions', input.userId, input.workflowId, String(limit)],
    { revalidate: 30, tags: [focusSessionsTag(input.userId), focusSessionsScopeTag({ userId: input.userId, workflowId: input.workflowId })] }
  )

  return cached()
}

export async function startFocusSession(input: { userId: string; workflowId: string; taskId?: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('focus_sessions')
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      task_id: input.taskId ?? null,
      started_at: new Date().toISOString(),
      status: 'active',
      duration_s: 0,
      ended_at: null,
    })
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as FocusSession
}

function durationSeconds(startedAtIso: string, endedAtIso: string) {
  const startMs = Date.parse(startedAtIso)
  const endMs = Date.parse(endedAtIso)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0
  return Math.floor((endMs - startMs) / 1000)
}

export async function endFocusSession(input: { userId: string; sessionId: string; status: 'completed' | 'cancelled' }) {
  const supabase = await createSupabaseServerClient()

  const current = await supabase
    .from('focus_sessions')
    .select('id,started_at')
    .eq('id', input.sessionId)
    .eq('user_id', input.userId)
    .single()
  if (current.error) throw current.error

  const endedAt = new Date().toISOString()
  const nextDuration = durationSeconds(current.data.started_at as string, endedAt)

  const res = await supabase
    .from('focus_sessions')
    .update({ ended_at: endedAt, status: input.status, duration_s: nextDuration })
    .eq('id', input.sessionId)
    .eq('user_id', input.userId)
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as FocusSession
}


