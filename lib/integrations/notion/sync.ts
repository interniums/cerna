import 'server-only'

import { listIntegrationAccounts } from '@/lib/db/integrations'
import { getIntegrationTokens } from '@/lib/integrations/tokens'
import { searchNotion } from '@/lib/integrations/notion/api'
import { upsertExternalItems } from '@/lib/db/external-items'

type SyncNotionRecentError = 'no_notion_account' | 'missing_tokens'

export async function syncNotionRecent(input: {
  userId: string
}): Promise<{ imported: number; error: SyncNotionRecentError | null }> {
  const accounts = await listIntegrationAccounts({ userId: input.userId, provider: 'notion' })
  if (accounts.length === 0) return { imported: 0, error: 'no_notion_account' as const }

  const account = accounts[0]
  const tokens = await getIntegrationTokens({ integrationAccountId: account.id })
  if (!tokens) return { imported: 0, error: 'missing_tokens' as const }

  const results = await searchNotion({ token: tokens.accessToken, pageSize: 25 })
  const nowIso = new Date().toISOString()

  const items = results
    .filter((r) => typeof r.id === 'string' && typeof r.url === 'string')
    .map((r) => {
      const occurredAt =
        (typeof r.last_edited_time === 'string' && r.last_edited_time) ||
        (typeof r.created_time === 'string' && r.created_time) ||
        null
      const type = typeof r.object === 'string' ? `notion_${r.object}` : 'notion_item'
      return {
        integration_account_id: account.id,
        provider: 'notion',
        type,
        external_id: r.id as string,
        external_url: r.url as string,
        title: 'Notion',
        summary: null,
        occurred_at: occurredAt,
        raw: r,
        synced_at: nowIso,
      }
    })

  await upsertExternalItems({ userId: input.userId, items })
  return { imported: items.length, error: null }
}
