import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncSlackMentions } from '@/lib/integrations/slack/sync'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const userRes = await supabase.auth.getUser()
  if (userRes.error || !userRes.data.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const user = userRes.data.user

  const result = await syncSlackMentions({ userId: user.id })
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, imported: result.imported })
}


