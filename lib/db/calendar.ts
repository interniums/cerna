import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CalendarAccount = {
  id: string
  user_id: string
  provider: 'google' | 'microsoft'
  email: string
  display_name: string | null
  last_error: string | null
  created_at: string
}

export type WorkflowCalendarVisibility = {
  workflow_id: string
  calendar_account_id: string
  enabled: boolean
  created_at: string
}

export async function listCalendarAccounts(userId: string) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (res.error) throw res.error
  return (res.data ?? []) as CalendarAccount[]
}

export async function listWorkflowCalendarVisibility(input: { userId: string; workflowId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('workflow_calendar_visibility')
    .select('*')
    .eq('workflow_id', input.workflowId)

  if (res.error) throw res.error
  return (res.data ?? []) as WorkflowCalendarVisibility[]
}

export async function upsertWorkflowCalendarVisibility(input: {
  workflowId: string
  calendarAccountId: string
  enabled: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('workflow_calendar_visibility')
    .upsert(
      { workflow_id: input.workflowId, calendar_account_id: input.calendarAccountId, enabled: input.enabled },
      { onConflict: 'workflow_id,calendar_account_id' }
    )
    .select('*')
    .single()

  if (res.error) throw res.error
  return res.data as WorkflowCalendarVisibility
}

export async function upsertCalendarAccount(input: {
  userId: string
  provider: 'google' | 'microsoft'
  email: string
  displayName?: string | null
}) {
  const supabase = await createSupabaseServerClient()

  // If an account exists, keep its id stable. Otherwise, insert.
  const existing = await supabase
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', input.userId)
    .eq('provider', input.provider)
    .ilike('email', input.email)
    .maybeSingle()
  if (existing.error) throw existing.error

  if (existing.data) {
    const updated = await supabase
      .from('calendar_accounts')
      .update({ display_name: input.displayName ?? null, last_error: null })
      .eq('id', (existing.data as CalendarAccount).id)
      .eq('user_id', input.userId)
      .select('*')
      .single()
    if (updated.error) throw updated.error
    return updated.data as CalendarAccount
  }

  const inserted = await supabase
    .from('calendar_accounts')
    .insert({
      user_id: input.userId,
      provider: input.provider,
      email: input.email,
      display_name: input.displayName ?? null,
    })
    .select('*')
    .single()

  if (inserted.error) throw inserted.error
  return inserted.data as CalendarAccount
}

export async function clearCalendarAccountError(input: { userId: string; accountId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('calendar_accounts').update({ last_error: null }).eq('id', input.accountId).eq('user_id', input.userId)
  if (res.error) throw res.error
}

export async function setCalendarAccountError(input: { userId: string; accountId: string; message: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('calendar_accounts')
    .update({ last_error: input.message.slice(0, 500) })
    .eq('id', input.accountId)
    .eq('user_id', input.userId)
  if (res.error) throw res.error
}

export async function deleteCalendarAccount(input: { userId: string; accountId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('calendar_accounts').delete().eq('id', input.accountId).eq('user_id', input.userId)
  if (res.error) throw res.error
}


