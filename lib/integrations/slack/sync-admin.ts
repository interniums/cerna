import 'server-only'

import { getIntegrationTokens } from '@/lib/integrations/tokens'
import { searchMessages } from '@/lib/integrations/slack/api'
import { upsertExternalItemsAdmin } from '@/lib/db/external-items-admin'
import { type IntegrationAccountRow } from '@/lib/db/integrations-admin'

function slackRedirectUrl(input: { channelId: string; messageTs: string }) {
  return `https://slack.com/app_redirect?channel=${encodeURIComponent(input.channelId)}&message_ts=${encodeURIComponent(input.messageTs)}`
}

function tsToIso(ts: string) {
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return null
  return new Date(n * 1000).toISOString()
}

export async function syncSlackMentionsForAccount(input: { account: IntegrationAccountRow }) {
  const tokens = await getIntegrationTokens({ integrationAccountId: input.account.id })
  if (!tokens) throw new Error('missing_tokens')

  const meta = (input.account.meta ?? {}) as Record<string, unknown>
  const authedUserId = typeof meta.authedUserId === 'string' ? meta.authedUserId : ''
  if (!authedUserId) throw new Error('missing_authed_user')

  const matches = await searchMessages({
    token: tokens.accessToken,
    query: `<@${authedUserId}>`,
    count: 50,
    sort: 'timestamp',
    sortDir: 'desc',
  })

  const nowIso = new Date().toISOString()
  const items = matches
    .filter((m) => typeof m.ts === 'string' && typeof m.channel?.id === 'string')
    .map((m) => {
      const channelId = String(m.channel?.id)
      const messageTs = String(m.ts)
      const url = typeof m.permalink === 'string' && m.permalink ? m.permalink : slackRedirectUrl({ channelId, messageTs })
      const occurredAt = tsToIso(messageTs)
      const channelName = typeof m.channel?.name === 'string' ? m.channel.name : null
      const username = typeof m.username === 'string' ? m.username : null
      const text = typeof m.text === 'string' ? m.text : ''

      return {
        integration_account_id: input.account.id,
        provider: 'slack',
        type: 'slack_message',
        external_id: `${channelId}:${messageTs}`,
        external_url: url,
        title: channelName ? `#${channelName}` : 'Slack message',
        summary: text ? text.slice(0, 4000) : null,
        author: username,
        channel: channelName ?? channelId,
        occurred_at: occurredAt,
        raw: m,
        synced_at: nowIso,
      }
    })

  await upsertExternalItemsAdmin({ userId: input.account.user_id, items })
  return { imported: items.length }
}


