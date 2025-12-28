import 'server-only'

import { type IntegrationAccountRow } from '@/lib/db/integrations-admin'
import { getIntegrationTokens } from '@/lib/integrations/tokens'
import { searchNotion } from '@/lib/integrations/notion/api'
import { upsertExternalItemsAdmin } from '@/lib/db/external-items-admin'

export async function syncNotionRecentForAccount(input: { account: IntegrationAccountRow }) {
  const tokens = await getIntegrationTokens({ integrationAccountId: input.account.id })
  if (!tokens) throw new Error('missing_tokens')

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
        integration_account_id: input.account.id,
        provider: 'notion',
        type,
        external_id: r.id as string,
        external_url: r.url as string,
        title: input.account.display_name ? `Notion (${input.account.display_name})` : 'Notion',
        summary: null,
        occurred_at: occurredAt,
        raw: r,
        synced_at: nowIso,
      }
    })

  await upsertExternalItemsAdmin({ userId: input.account.user_id, items })
  return { imported: items.length }
}


