import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function insertIntegrationLogAdmin(input: {
  userId: string
  provider: string
  stage: string
  message: string
  integrationAccountId?: string | null
  details?: Record<string, unknown>
}) {
  const admin = createSupabaseAdminClient()
  const res = await admin.from('integration_logs').insert({
    user_id: input.userId,
    provider: input.provider,
    stage: input.stage,
    message: input.message.slice(0, 2000),
    integration_account_id: input.integrationAccountId ?? null,
    details: input.details ?? {},
  })
  if (res.error) throw res.error
}


