import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function upsertExternalItemsAdmin(input: {
  userId: string
  items: Array<{
    integration_account_id: string | null
    provider: string
    type: string
    external_id: string
    external_url: string
    title?: string | null
    summary?: string | null
    status?: string | null
    due_at?: string | null
    author?: string | null
    channel?: string | null
    occurred_at?: string | null
    raw?: unknown | null
    synced_at?: string | null
    deleted_at?: string | null
  }>
}) {
  if (input.items.length === 0) return
  const admin = createSupabaseAdminClient()
  const payload = input.items.map((i) => ({
    user_id: input.userId,
    integration_account_id: i.integration_account_id ?? null,
    provider: i.provider,
    type: i.type,
    external_id: i.external_id,
    external_url: i.external_url,
    title: i.title ?? null,
    summary: i.summary ?? null,
    status: i.status ?? null,
    due_at: i.due_at ?? null,
    author: i.author ?? null,
    channel: i.channel ?? null,
    occurred_at: i.occurred_at ?? null,
    raw: i.raw ?? null,
    synced_at: i.synced_at ?? new Date().toISOString(),
    deleted_at: i.deleted_at ?? null,
  }))

  const res = await admin.from('external_items').upsert(payload, { onConflict: 'user_id,provider,type,external_id' })
  if (res.error) throw res.error
}


