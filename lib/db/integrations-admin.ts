import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type IntegrationAccountRow = {
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

export async function listIntegrationAccountsAdmin(input?: { provider?: string; limit?: number }) {
  const admin = createSupabaseAdminClient()
  let q = admin.from('integration_accounts').select('*').order('created_at', { ascending: true })
  if (input?.provider) q = q.eq('provider', input.provider)
  const res = await q.limit(input?.limit ?? 5000)
  if (res.error) throw res.error
  return (res.data ?? []) as IntegrationAccountRow[]
}

export async function updateIntegrationAccountAdmin(input: {
  accountId: string
  patch: Partial<Pick<IntegrationAccountRow, 'display_name' | 'meta' | 'last_error'>>
}) {
  const admin = createSupabaseAdminClient()
  const res = await admin.from('integration_accounts').update(input.patch).eq('id', input.accountId)
  if (res.error) throw res.error
}


