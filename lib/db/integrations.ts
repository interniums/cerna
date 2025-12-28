import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type IntegrationProvider = 'slack' | 'notion' | 'asana' | 'google_keep' | 'google_drive' | 'gmail'

export type IntegrationAccount = {
  id: string
  user_id: string
  provider: string
  external_account_id: string
  display_name: string | null
  meta: Record<string, unknown>
  last_error: string | null
  created_at: string
  updated_at: string
}

export async function listIntegrationAccounts(input: { userId: string; provider?: string }) {
  const supabase = await createSupabaseServerClient()
  let query = supabase.from('integration_accounts').select('*').eq('user_id', input.userId).order('created_at', { ascending: true })
  if (input.provider) query = query.eq('provider', input.provider)
  const res = await query
  if (res.error) throw res.error
  return (res.data ?? []) as IntegrationAccount[]
}

export async function upsertIntegrationAccount(input: {
  userId: string
  provider: IntegrationProvider | (string & {})
  externalAccountId: string
  displayName?: string | null
  meta?: Record<string, unknown>
}) {
  const supabase = await createSupabaseServerClient()

  const existing = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('user_id', input.userId)
    .eq('provider', input.provider)
    .eq('external_account_id', input.externalAccountId)
    .maybeSingle()
  if (existing.error) throw existing.error

  if (existing.data) {
    const updated = await supabase
      .from('integration_accounts')
      .update({
        display_name: input.displayName ?? null,
        meta: input.meta ?? (existing.data as IntegrationAccount).meta ?? {},
        last_error: null,
      })
      .eq('id', (existing.data as IntegrationAccount).id)
      .eq('user_id', input.userId)
      .select('*')
      .single()
    if (updated.error) throw updated.error
    return updated.data as IntegrationAccount
  }

  const inserted = await supabase
    .from('integration_accounts')
    .insert({
      user_id: input.userId,
      provider: input.provider,
      external_account_id: input.externalAccountId,
      display_name: input.displayName ?? null,
      meta: input.meta ?? {},
    })
    .select('*')
    .single()
  if (inserted.error) throw inserted.error
  return inserted.data as IntegrationAccount
}

export async function clearIntegrationAccountError(input: { userId: string; accountId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('integration_accounts').update({ last_error: null }).eq('id', input.accountId).eq('user_id', input.userId)
  if (res.error) throw res.error
}

export async function setIntegrationAccountError(input: { userId: string; accountId: string; message: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('integration_accounts')
    .update({ last_error: input.message.slice(0, 500) })
    .eq('id', input.accountId)
    .eq('user_id', input.userId)
  if (res.error) throw res.error
}

export async function deleteIntegrationAccount(input: { userId: string; accountId: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('integration_accounts').delete().eq('id', input.accountId).eq('user_id', input.userId)
  if (res.error) throw res.error
}


