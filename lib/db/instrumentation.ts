import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type InstrumentationEventName =
  | 'view_dashboard'
  | 'view_command_center'
  | 'view_morning'
  | 'task_created'
  | 'task_completed'
  | 'task_reopened'
  | 'task_deleted'
  | 'task_restored'
  | 'focus_started'
  | 'focus_completed'
  | 'focus_cancelled'

export async function recordInstrumentationEvent(input: {
  userId: string
  workflowId: string
  name: InstrumentationEventName
  meta?: Record<string, unknown>
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('instrumentation_events').insert({
    user_id: input.userId,
    workflow_id: input.workflowId,
    name: input.name,
    meta: input.meta ?? {},
  })

  if (res.error) throw res.error
}

export async function getLatestInstrumentationEvent(input: {
  userId: string
  workflowId: string
  names: InstrumentationEventName[]
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('instrumentation_events')
    .select('name,created_at')
    .eq('user_id', input.userId)
    .eq('workflow_id', input.workflowId)
    .in('name', input.names)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (res.error) throw res.error
  if (!res.data) return null
  return res.data as { name: InstrumentationEventName; created_at: string }
}


