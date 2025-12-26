import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { listResources } from '@/lib/db/resources'
import { searchResources } from '@/lib/search/resources-search'
import { getDefaultWorkflowId } from '@/lib/db/workflows'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  workflowId: z.string().uuid().optional(),
  q: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
})

type SpotlightResource = {
  id: string
  url: string
  title: string | null
  notes: string | null
  favicon_url: string | null
  image_url: string | null
  is_pinned: boolean
  is_essential: boolean
}

export async function POST(request: Request) {
  const user = await requireServerUser()

  const json = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const q = (parsed.data.q ?? '').trim()
  const limit = parsed.data.limit ?? 20
  const workflowId = parsed.data.workflowId ?? (await getDefaultWorkflowId({ userId: user.id }))

  const resources = q
    ? await searchResources({ userId: user.id, workflowId, query: q, limit })
    : await listResources({ userId: user.id, workflowId, scope: 'all', mode: 'recent', limit })

  const items: SpotlightResource[] = resources.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    notes: r.notes,
    favicon_url: r.favicon_url,
    image_url: r.image_url,
    is_pinned: r.is_pinned,
    is_essential: r.is_essential,
  }))

  return NextResponse.json({ ok: true, items })
}
