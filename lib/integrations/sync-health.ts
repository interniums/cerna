import 'server-only'

import { updateIntegrationAccountAdmin, type IntegrationAccountRow } from '@/lib/db/integrations-admin'

type SyncMeta = {
  sync_error_count?: number
  sync_backoff_until?: string
  last_synced_at?: string
  last_sync_status?: 'ok' | 'error'
}

function getMeta(account: IntegrationAccountRow) {
  return (account.meta ?? {}) as Record<string, unknown>
}

function getSyncMeta(account: IntegrationAccountRow): SyncMeta {
  const meta = getMeta(account)
  const sync = (meta.sync ?? {}) as Record<string, unknown>
  return {
    sync_error_count: typeof sync.sync_error_count === 'number' ? sync.sync_error_count : 0,
    sync_backoff_until: typeof sync.sync_backoff_until === 'string' ? sync.sync_backoff_until : undefined,
    last_synced_at: typeof sync.last_synced_at === 'string' ? sync.last_synced_at : undefined,
    last_sync_status: sync.last_sync_status === 'ok' || sync.last_sync_status === 'error' ? sync.last_sync_status : undefined,
  }
}

export function canSyncNow(account: IntegrationAccountRow) {
  const sm = getSyncMeta(account)
  if (!sm.sync_backoff_until) return true
  const until = Date.parse(sm.sync_backoff_until)
  if (!Number.isFinite(until)) return true
  return until <= Date.now()
}

export async function markSyncSuccess(input: { account: IntegrationAccountRow }) {
  const meta = getMeta(input.account)
  const next = {
    ...meta,
    sync: {
      ...(typeof meta.sync === 'object' && meta.sync ? (meta.sync as object) : {}),
      sync_error_count: 0,
      sync_backoff_until: null,
      last_synced_at: new Date().toISOString(),
      last_sync_status: 'ok',
    },
  }

  await updateIntegrationAccountAdmin({ accountId: input.account.id, patch: { last_error: null, meta: next } })
}

export async function markSyncError(input: { account: IntegrationAccountRow; message: string }) {
  const meta = getMeta(input.account)
  const sm = getSyncMeta(input.account)
  const nextCount = Math.min(10, (sm.sync_error_count ?? 0) + 1)
  const backoffMinutes = Math.min(60, 2 ** Math.min(6, nextCount)) // 2,4,8,16,32,64 capped at 60
  const backoffUntil = new Date(Date.now() + backoffMinutes * 60_000).toISOString()

  const next = {
    ...meta,
    sync: {
      ...(typeof meta.sync === 'object' && meta.sync ? (meta.sync as object) : {}),
      sync_error_count: nextCount,
      sync_backoff_until: backoffUntil,
      last_sync_status: 'error',
    },
  }

  await updateIntegrationAccountAdmin({
    accountId: input.account.id,
    patch: { last_error: input.message.slice(0, 500), meta: next },
  })
}


