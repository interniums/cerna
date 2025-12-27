import { NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

import { requireServerUser } from '@/lib/supabase/auth'
import { setTaskStatus } from '@/lib/db/tasks'
import { tasksTag } from '@/lib/cache/tags'
import { recordInstrumentationEvent } from '@/lib/db/instrumentation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  taskId: z.string().uuid(),
  nextStatus: z.enum(['open', 'done']),
})

export async function POST(request: Request) {
  const user = await requireServerUser()

  const json = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }

  try {
    const updated = await setTaskStatus({ userId: user.id, taskId: parsed.data.taskId, status: parsed.data.nextStatus })
    void recordInstrumentationEvent({
      userId: user.id,
      workflowId: updated.workflow_id,
      name: updated.status === 'done' ? 'task_completed' : 'task_reopened',
      meta: { task_id: updated.id },
    }).catch((error) => console.error('recordInstrumentationEvent failed', error))

    revalidateTag(tasksTag(user.id), { expire: 0 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, message: 'Couldn’t update. Try again.' }, { status: 500 })
  }
}


