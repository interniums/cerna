import 'server-only'

import { listIntegrationAccounts } from '@/lib/db/integrations'
import { getIntegrationTokens } from '@/lib/integrations/tokens'
import { searchMessages } from '@/lib/integrations/slack/api'
import { upsertExternalItems } from '@/lib/db/external-items'

function slackRedirectUrl(input: { channelId: string; messageTs: string }) {
  // Works without needing team domain, opens in Slack client/web.
  return `https://slack.com/app_redirect?channel=${encodeURIComponent(input.channelId)}&message_ts=${encodeURIComponent(input.messageTs)}`
}

function tsToIso(ts: string) {
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return null
  return new Date(n * 1000).toISOString()
}

export async function syncSlackMentions(input: { userId: string }) {
  const accounts = await listIntegrationAccounts({ userId: input.userId, provider: 'slack' })
  if (accounts.length === 0) {
    return { imported: 0, error: 'no_slack_account' as const }
  }

  // V1: sync the first connected workspace.
  const account = accounts[0]
  const tokens = await getIntegrationTokens({ integrationAccountId: account.id })
  if (!tokens) {
    return { imported: 0, error: 'missing_tokens' as const }
  }

  const meta = (account.meta ?? {}) as Record<string, unknown>
  const authedUserId = typeof meta.authedUserId === 'string' ? meta.authedUserId : ''
  if (!authedUserId) {
    return { imported: 0, error: 'missing_authed_user' as const }
  }

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
        integration_account_id: account.id,
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

  await upsertExternalItems({ userId: input.userId, items })
  return { imported: items.length, error: null as const }
}


