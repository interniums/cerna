import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type SyncCursor = {
  id: string
  user_id: string
  integration_account_id: string
  scope: string
  cursor: string | null
  updated_at: string
  created_at: string
}

export async function getSyncCursor(input: { userId: string; integrationAccountId: string; scope: string }) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('sync_cursors')
    .select('*')
    .eq('user_id', input.userId)
    .eq('integration_account_id', input.integrationAccountId)
    .eq('scope', input.scope)
    .maybeSingle()
  if (res.error) throw res.error
  return (res.data ?? null) as SyncCursor | null
}

export async function upsertSyncCursor(input: {
  userId: string
  integrationAccountId: string
  scope: string
  cursor: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('sync_cursors')
    .upsert(
      {
        user_id: input.userId,
        integration_account_id: input.integrationAccountId,
        scope: input.scope,
        cursor: input.cursor,
      },
      { onConflict: 'user_id,integration_account_id,scope' }
    )
    .select('*')
    .single()
  if (res.error) throw res.error
  return res.data as SyncCursor
}


