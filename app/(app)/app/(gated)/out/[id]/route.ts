import { type NextRequest, NextResponse } from 'next/server'

import { requireServerUser } from '@/lib/supabase/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireServerUser()
  const { id: resourceId } = await context.params

  const supabase = await createSupabaseServerClient()
  const resource = await supabase
    .from('resources')
    .select('id,url')
    .eq('id', resourceId)
    .eq('user_id', user.id)
    .single()

  if (resource.error) {
    return NextResponse.redirect(new URL('/app/all', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
  }

  // Best-effort: record visit. RLS enforces ownership + entitlement.
  const visit = await supabase.rpc('record_resource_visit', { query_resource_id: resourceId })
  void visit.error

  return NextResponse.redirect(resource.data.url)
}
