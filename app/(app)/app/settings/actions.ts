'use server'

import { redirect } from 'next/navigation'

import { getOrCreateStripeCustomerId } from '@/lib/db/stripe'
import { getSiteUrl } from '@/lib/site/url'
import { getStripe } from '@/lib/stripe/server'
import { requireServerUser } from '@/lib/supabase/auth'

export async function openBillingPortalAction() {
  const user = await requireServerUser()

  const customerId = await getOrCreateStripeCustomerId({
    userId: user.id,
    email: user.email ?? null,
  })

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getSiteUrl()}/app/settings`,
  })

  redirect(session.url)
}
