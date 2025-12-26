'use server'

import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { recordInstrumentationEvent, type InstrumentationEventName } from '@/lib/db/instrumentation'

const AnchorSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.enum(['view_dashboard', 'view_command_center', 'view_morning']),
})

export async function recordAnchorEventAction(formData: FormData) {
  const parsed = AnchorSchema.safeParse({
    workflowId: formData.get('workflowId'),
    name: formData.get('name'),
  })
  if (!parsed.success) return

  const user = await requireServerUser()
  await recordInstrumentationEvent({
    userId: user.id,
    workflowId: parsed.data.workflowId,
    name: parsed.data.name as InstrumentationEventName,
    meta: {},
  })
}


