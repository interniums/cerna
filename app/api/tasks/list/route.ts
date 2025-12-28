import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { listTasks } from '@/lib/db/tasks'

const QuerySchema = z.object({
  workflowId: z.string().uuid(),
})

export async function GET(req: Request) {
  try {
    const user = await requireServerUser()

    const url = new URL(req.url)
    const parsed = QuerySchema.safeParse({
      workflowId: url.searchParams.get('workflowId'),
    })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid workflowId.' }, { status: 400 })
    }

    const tasks = await listTasks({ userId: user.id, workflowId: parsed.data.workflowId, scope: 'open' })
    return NextResponse.json({ ok: true, tasks })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Couldn’t load tasks.'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}


