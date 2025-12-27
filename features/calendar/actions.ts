'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

import { requireServerUser } from '@/lib/supabase/auth'
import { deleteCalendarAccount, upsertWorkflowCalendarVisibility } from '@/lib/db/calendar'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type CalendarActionState =
  | { ok: true; nonce: number }
  | { ok: false; message: string; nonce: number }

function createNonce() {
  return Date.now()
}

const tagRevalidateProfile = { expire: 0 } as const

const ToggleVisibilitySchema = z.object({
  workflowId: z.string().uuid(),
  accountId: z.string().uuid(),
  enabled: z.enum(['true', 'false']),
})

export async function toggleWorkflowCalendarVisibilityAction(
  _prev: CalendarActionState,
  formData: FormData
): Promise<CalendarActionState> {
  const parsed = ToggleVisibilitySchema.safeParse({
    workflowId: formData.get('workflowId'),
    accountId: formData.get('accountId'),
    enabled: formData.get('enabled'),
  })
  if (!parsed.success) return { ok: false, message: 'Couldn’t update calendar settings.', nonce: createNonce() }

  const user = await requireServerUser()
  try {
    await upsertWorkflowCalendarVisibility({
      workflowId: parsed.data.workflowId,
      calendarAccountId: parsed.data.accountId,
      enabled: parsed.data.enabled === 'true',
    })
    // Widget is client-fetched, but revalidation helps if we later cache server-side.
    revalidateTag(`calendar:${user.id}`, tagRevalidateProfile)
    return { ok: true, nonce: createNonce() }
  } catch {
    return { ok: false, message: 'Couldn’t save. Try again.', nonce: createNonce() }
  }
}

const DisconnectSchema = z.object({
  accountId: z.string().uuid(),
})

export async function disconnectCalendarAccountAction(
  _prev: CalendarActionState,
  formData: FormData
): Promise<CalendarActionState> {
  const parsed = DisconnectSchema.safeParse({ accountId: formData.get('accountId') })
  if (!parsed.success) return { ok: false, message: 'Couldn’t disconnect that account.', nonce: createNonce() }

  const user = await requireServerUser()

  try {
    const admin = createSupabaseAdminClient()
    const delTokens = await admin.from('calendar_account_tokens').delete().eq('calendar_account_id', parsed.data.accountId)
    if (delTokens.error) throw delTokens.error

    await deleteCalendarAccount({ userId: user.id, accountId: parsed.data.accountId })
    revalidateTag(`calendar:${user.id}`, tagRevalidateProfile)
    return { ok: true, nonce: createNonce() }
  } catch {
    return { ok: false, message: 'Couldn’t disconnect. Try again.', nonce: createNonce() }
  }
}


