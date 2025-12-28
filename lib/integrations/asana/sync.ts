import 'server-only'

import { listIntegrationAccounts, setIntegrationAccountError, upsertIntegrationAccount } from '@/lib/db/integrations'
import { getIntegrationTokens, upsertIntegrationTokens } from '@/lib/integrations/tokens'
import { fetchAsanaMe, listMyOpenTasks } from '@/lib/integrations/asana/api'
import { refreshAsanaAccessToken } from '@/lib/integrations/asana/oauth'
import { upsertExternalItems } from '@/lib/db/external-items'

function isExpiringSoon(expiresAtIso: string | null) {
  if (!expiresAtIso) return false
  const ms = Date.parse(expiresAtIso)
  if (!Number.isFinite(ms)) return false
  return ms - Date.now() < 60_000
}

type SyncAsanaMyTasksError = 'no_asana_account' | 'missing_tokens' | 'refresh_failed' | 'missing_workspace'

export async function syncAsanaMyTasks(input: {
  userId: string
}): Promise<{ imported: number; error: SyncAsanaMyTasksError | null }> {
  const accounts = await listIntegrationAccounts({ userId: input.userId, provider: 'asana' })
  if (accounts.length === 0) return { imported: 0, error: 'no_asana_account' as const }

  const account = accounts[0]
  let tokens = await getIntegrationTokens({ integrationAccountId: account.id })
  if (!tokens) return { imported: 0, error: 'missing_tokens' as const }

  try {
    if (isExpiringSoon(tokens.expiresAt) && tokens.refreshToken) {
      const refreshed = await refreshAsanaAccessToken({ refreshToken: tokens.refreshToken })
      await upsertIntegrationTokens({
        integrationAccountId: account.id,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
        expiresAt: refreshed.expiresAt,
        scopes: tokens.scopes,
      })
      tokens = await getIntegrationTokens({ integrationAccountId: account.id })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Asana refresh failed.'
    await setIntegrationAccountError({ userId: input.userId, accountId: account.id, message: msg })
    return { imported: 0, error: 'refresh_failed' as const }
  }

  if (!tokens) return { imported: 0, error: 'missing_tokens' as const }

  const me = await fetchAsanaMe({ token: tokens.accessToken })

  // Keep account display/meta in sync (email/name/workspace).
  // NOTE: We use the same external_account_id as the connected account to avoid duplicates.
  await upsertIntegrationAccount({
    userId: input.userId,
    provider: 'asana',
    externalAccountId: account.external_account_id,
    displayName: me.name,
    meta: { email: me.email, defaultWorkspaceGid: me.defaultWorkspaceGid },
  })

  const workspaceGid = me.defaultWorkspaceGid
  if (!workspaceGid || typeof workspaceGid !== 'string') return { imported: 0, error: 'missing_workspace' as const }

  const tasks = await listMyOpenTasks({ token: tokens.accessToken, workspaceGid, limit: 50 })
  const nowIso = new Date().toISOString()

  const items = tasks
    .filter((t) => typeof t.gid === 'string' && typeof t.permalink_url === 'string')
    .map((t) => {
      const dueAt =
        (typeof t.due_at === 'string' && t.due_at) ||
        (typeof t.due_on === 'string' && t.due_on ? `${t.due_on}T00:00:00.000Z` : null)
      const occurredAt = typeof t.modified_at === 'string' ? t.modified_at : null
      const title = typeof t.name === 'string' ? t.name : 'Asana task'
      const summary = typeof t.notes === 'string' && t.notes.trim() ? t.notes.slice(0, 4000) : null
      return {
        integration_account_id: account.id,
        provider: 'asana',
        type: 'asana_task',
        external_id: t.gid as string,
        external_url: t.permalink_url as string,
        title: title.slice(0, 200),
        summary,
        status: t.completed ? 'done' : 'open',
        due_at: dueAt,
        occurred_at: occurredAt,
        raw: t,
        synced_at: nowIso,
      }
    })

  await upsertExternalItems({ userId: input.userId, items })
  return { imported: items.length, error: null }
}
