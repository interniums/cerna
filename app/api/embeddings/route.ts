import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireActiveEntitlement } from '@/lib/billing/entitlements'
import { indexResourceEmbedding } from '@/lib/search/indexing'
import { requireServerUser } from '@/lib/supabase/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  resourceId: z.string().uuid(),
})

export async function POST(request: Request) {
  const user = await requireServerUser()
  await requireActiveEntitlement(user.id)

  const json = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  await indexResourceEmbedding({ userId: user.id, resourceId: parsed.data.resourceId })
  return NextResponse.json({ ok: true })
}
