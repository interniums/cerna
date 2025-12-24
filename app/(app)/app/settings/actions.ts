'use server'

import { redirect } from 'next/navigation'

import { isBillingEnabled } from '@/lib/billing/mode'
import { getSiteUrl } from '@/lib/site/url'
import { solidgateCancelSubscriptionByCustomer } from '@/lib/solidgate/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireServerUser } from '@/lib/supabase/auth'

async function requireSolidgateCustomerAccountId(userId: string) {
  const supabase = await createSupabaseServerClient()
  const res = await supabase
    .from('billing_customers')
    .select('provider_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (res.error) throw res.error
  const id = res.data?.provider_customer_id ?? null
  if (!id) throw new Error('Billing customer not found. Please complete checkout first.')
  return id
}

export async function manageBillingAction() {
  if (!isBillingEnabled()) redirect(`${getSiteUrl()}/app/settings`)

  // For now we keep users in-app; this action routes to the Billing section.
  // (Server Action used to avoid UI handler logic.)
  redirect(`${getSiteUrl()}/app/settings`)
}

export async function cancelSubscriptionAction() {
  if (!isBillingEnabled()) redirect(`${getSiteUrl()}/app/settings`)

  const user = await requireServerUser()

  const customerAccountId = await requireSolidgateCustomerAccountId(user.id)
  await solidgateCancelSubscriptionByCustomer({ customerAccountId })

  // Entitlements will update via webhook; keep UX predictable.
  redirect(`${getSiteUrl()}/app/settings`)
}
