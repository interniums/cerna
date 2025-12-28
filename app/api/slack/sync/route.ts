import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncSlackMentions } from '@/lib/integrations/slack/sync'
import { logIntegrationError } from '@/lib/integrations/error-logging'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const userRes = await supabase.auth.getUser()
  if (userRes.error || !userRes.data.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const user = userRes.data.user

  try {
    const result = await syncSlackMentions({ userId: user.id })
    if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true, imported: result.imported })
  } catch (e: unknown) {
    await logIntegrationError({ userId: user.id, provider: 'slack', stage: 'api_sync', error: e })
    return NextResponse.json({ ok: false, error: 'sync_failed' }, { status: 500 })
  }
}


