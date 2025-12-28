import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ExternalItem = {
  id: string
  user_id: string
  integration_account_id: string | null
  provider: string
  type: string
  external_id: string
  external_url: string
  title: string | null
  summary: string | null
  status: string | null
  due_at: string | null
  author: string | null
  channel: string | null
  occurred_at: string | null
  raw: unknown | null
  synced_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ExternalLink = {
  id: string
  user_id: string
  source_kind: 'task' | 'resource' | 'note'
  source_id: string
  external_item_id: string
  created_at: string
}

export async function listExternalItems(input: {
  userId: string
  provider?: string
  type?: string
  limit?: number
}) {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('external_items')
    .select('*')
    .eq('user_id', input.userId)
    .is('deleted_at', null)

  if (input.provider) query = query.eq('provider', input.provider)
  if (input.type) query = query.eq('type', input.type)

  query = query.order('occurred_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })

  const res = await query.limit(input.limit ?? 200)
  if (res.error) throw res.error
  return (res.data ?? []) as ExternalItem[]
}

export async function upsertExternalItems(input: {
  userId: string
  items: Array<
    Pick<ExternalItem, 'provider' | 'type' | 'external_id' | 'external_url'> &
      Partial<
        Pick<
          ExternalItem,
          | 'integration_account_id'
          | 'title'
          | 'summary'
          | 'status'
          | 'due_at'
          | 'author'
          | 'channel'
          | 'occurred_at'
          | 'raw'
          | 'synced_at'
          | 'deleted_at'
        >
      >
  >
}) {
  if (input.items.length === 0) return []
  const supabase = await createSupabaseServerClient()

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

  const res = await supabase.from('external_items').upsert(payload, {
    onConflict: 'user_id,provider,type,external_id',
  })
  if (res.error) throw res.error
  return payload
}

export async function createExternalLink(input: {
  userId: string
  sourceKind: ExternalLink['source_kind']
  sourceId: string
  externalItemId: string
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('external_links')
    .insert({
      user_id: input.userId,
      source_kind: input.sourceKind,
      source_id: input.sourceId,
      external_item_id: input.externalItemId,
    })
    .select('*')
    .single()
  if (res.error) throw res.error
  return res.data as ExternalLink
}

export async function listExternalLinksForSource(input: {
  userId: string
  sourceKind: ExternalLink['source_kind']
  sourceId: string
}) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('external_links')
    .select('*, external_item:external_items(*)')
    .eq('user_id', input.userId)
    .eq('source_kind', input.sourceKind)
    .eq('source_id', input.sourceId)
    .order('created_at', { ascending: true })
  if (res.error) throw res.error
  return res.data ?? []
}


