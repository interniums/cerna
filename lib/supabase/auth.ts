import 'server-only'

import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureDevEntitlement } from '@/lib/billing/entitlements'

export async function getServerUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) return null

  const user = data.user ?? null
  if (user) {
    // Local/dev: keep DB RLS entitlements aligned with billing-disabled app mode.
    await ensureDevEntitlement(user.id)
  }

  return user
}

export async function requireServerUser() {
  const user = await getServerUser()
  if (!user) redirect('/login')
  return user
}
