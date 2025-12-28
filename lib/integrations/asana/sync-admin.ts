import 'server-only'

import { type IntegrationAccountRow } from '@/lib/db/integrations-admin'
import { getIntegrationTokens, upsertIntegrationTokens } from '@/lib/integrations/tokens'
import { fetchAsanaMe, listMyOpenTasks } from '@/lib/integrations/asana/api'
import { refreshAsanaAccessToken } from '@/lib/integrations/asana/oauth'
import { upsertExternalItemsAdmin } from '@/lib/db/external-items-admin'

function isExpiringSoon(expiresAtIso: string | null) {
  if (!expiresAtIso) return false
  const ms = Date.parse(expiresAtIso)
  if (!Number.isFinite(ms)) return false
  return ms - Date.now() < 60_000
}

export async function syncAsanaMyTasksForAccount(input: { account: IntegrationAccountRow }) {
  let tokens = await getIntegrationTokens({ integrationAccountId: input.account.id })
  if (!tokens) throw new Error('missing_tokens')

  if (isExpiringSoon(tokens.expiresAt) && tokens.refreshToken) {
    const refreshed = await refreshAsanaAccessToken({ refreshToken: tokens.refreshToken })
    await upsertIntegrationTokens({
      integrationAccountId: input.account.id,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      expiresAt: refreshed.expiresAt,
      scopes: tokens.scopes,
    })
    tokens = await getIntegrationTokens({ integrationAccountId: input.account.id })
  }

  if (!tokens) throw new Error('missing_tokens')

  const me = await fetchAsanaMe({ token: tokens.accessToken })
  const workspaceGid = me.defaultWorkspaceGid
  if (!workspaceGid) throw new Error('missing_workspace')

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
        integration_account_id: input.account.id,
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

  await upsertExternalItemsAdmin({ userId: input.account.user_id, items })
  return { imported: items.length }
}


