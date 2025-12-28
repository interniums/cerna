'use server'

import { redirect } from 'next/navigation'

import { isBillingEnabled } from '@/lib/billing/mode'
import { getSiteUrl } from '@/lib/site/url'
import { solidgateCancelSubscriptionByCustomer } from '@/lib/solidgate/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireServerUser } from '@/lib/supabase/auth'
import { deleteIntegrationAccount } from '@/lib/db/integrations'

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

export async function disconnectSlackAction(formData: FormData) {
  const user = await requireServerUser()
  const accountId = String(formData.get('accountId') ?? '')
  if (!accountId) redirect(`${getSiteUrl()}/app/settings`)

  // This deletes the integration account row; token rows and cursors cascade.
  await deleteIntegrationAccount({ userId: user.id, accountId })
  redirect(`${getSiteUrl()}/app/settings`)
}

export async function disconnectNotionAction(formData: FormData) {
  const user = await requireServerUser()
  const accountId = String(formData.get('accountId') ?? '')
  if (!accountId) redirect(`${getSiteUrl()}/app/settings`)
  await deleteIntegrationAccount({ userId: user.id, accountId })
  redirect(`${getSiteUrl()}/app/settings`)
}

export async function disconnectAsanaAction(formData: FormData) {
  const user = await requireServerUser()
  const accountId = String(formData.get('accountId') ?? '')
  if (!accountId) redirect(`${getSiteUrl()}/app/settings`)
  await deleteIntegrationAccount({ userId: user.id, accountId })
  redirect(`${getSiteUrl()}/app/settings`)
}
