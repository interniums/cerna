import 'server-only'

import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function hasActiveEntitlement(userId: string) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('entitlements').select('is_active').eq('user_id', userId).maybeSingle()

  if (res.error) return false
  return res.data?.is_active === true
}

export async function requireActiveEntitlement(userId: string) {
  const ok = await hasActiveEntitlement(userId)
  if (!ok) redirect('/app/subscribe')
}
