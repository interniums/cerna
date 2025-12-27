import 'server-only'

import { redirect } from 'next/navigation'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isBillingEnabled } from '@/lib/billing/mode'

export async function hasActiveEntitlement(userId: string) {
  if (!isBillingEnabled()) return true

  const supabase = await createSupabaseServerClient()
  const res = await supabase.from('entitlements').select('is_active').eq('user_id', userId).maybeSingle()

  if (res.error) return false
  return res.data?.is_active === true
}

export async function requireActiveEntitlement(userId: string) {
  if (!isBillingEnabled()) return

  const ok = await hasActiveEntitlement(userId)
  if (!ok) redirect('/app/subscribe')
}

/**
 * Local/dev convenience: when billing is disabled in the app, writes should work without subscription.
 *
 * Our DB RLS policies still require `public.entitlements.is_active = true` for writes, so in dev we
 * seed an active entitlement row using the Supabase service role (server-only).
 */
export async function ensureDevEntitlement(userId: string) {
  if (isBillingEnabled()) return

  try {
    const admin = createSupabaseAdminClient()
    const res = await admin
      .from('entitlements')
      .upsert({ user_id: userId, is_active: true }, { onConflict: 'user_id' })
      .select('user_id,is_active')
      .maybeSingle()

    if (res.error) {
      console.warn('[dev] ensureDevEntitlement failed', res.error)
    }
  } catch (error) {
    // Keep dev non-blocking: the app can still render; writes will surface a permission error.
    console.warn('[dev] ensureDevEntitlement threw', error)
  }
}
