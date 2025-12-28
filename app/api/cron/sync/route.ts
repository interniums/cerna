import { NextResponse } from 'next/server'

import { listIntegrationAccountsAdmin } from '@/lib/db/integrations-admin'
import { canSyncNow, markSyncError, markSyncSuccess } from '@/lib/integrations/sync-health'
import { syncSlackMentionsForAccount } from '@/lib/integrations/slack/sync-admin'
import { syncNotionRecentForAccount } from '@/lib/integrations/notion/sync-admin'
import { syncAsanaMyTasksForAccount } from '@/lib/integrations/asana/sync-admin'
import { logIntegrationError } from '@/lib/integrations/error-logging'

function requireCronAuth(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('Missing CRON_SECRET.')
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

export async function POST(request: Request) {
  try {
    if (!requireCronAuth(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const accounts = await listIntegrationAccountsAdmin({ limit: 5000 })
    let attempted = 0
    let skippedBackoff = 0
    let ok = 0
    let failed = 0

    for (const account of accounts) {
      if (!canSyncNow(account)) {
        skippedBackoff++
        continue
      }

      attempted++
      try {
        if (account.provider === 'slack') await syncSlackMentionsForAccount({ account })
        else if (account.provider === 'notion') await syncNotionRecentForAccount({ account })
        else if (account.provider === 'asana') await syncAsanaMyTasksForAccount({ account })
        else continue

        ok++
        await markSyncSuccess({ account })
      } catch (e: unknown) {
        failed++
        const msg = e instanceof Error ? e.message : 'Sync failed.'
        await markSyncError({ account, message: msg })
        await logIntegrationError({
          userId: account.user_id,
          provider: account.provider,
          stage: 'cron_sync',
          integrationAccountId: account.id,
          error: e,
        })
      }
    }

    return NextResponse.json({ ok: true, attempted, skippedBackoff, success: ok, failed })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Cron sync failed.'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}


