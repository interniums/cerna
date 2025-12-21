import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { fetchUrlMetadata } from '@/lib/metadata/fetch-url-metadata'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  url: z.string().url().max(2048),
})

export async function POST(request: Request) {
  await requireServerUser()

  const json = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const meta = await fetchUrlMetadata({ url: parsed.data.url, timeoutMs: 1500 })
  return NextResponse.json({ ok: true, meta })
}


