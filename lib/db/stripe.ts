import 'server-only'

import type Stripe from 'stripe'

import { getStripe } from '@/lib/stripe/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type StripeCustomerRow = {
  user_id: string
  stripe_customer_id: string
}

export async function getOrCreateStripeCustomerId(input: { userId: string; email: string | null }) {
  const supabase = await createSupabaseServerClient()

  const existing = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', input.userId)
    .maybeSingle()

  if (existing.data?.stripe_customer_id) return existing.data.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    metadata: { user_id: input.userId },
  })

  const row: StripeCustomerRow = {
    user_id: input.userId,
    stripe_customer_id: customer.id,
  }

  const inserted = await supabase.from('stripe_customers').insert(row)
  if (inserted.error) throw inserted.error

  return customer.id
}

export function isActiveSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === 'active' || status === 'trialing'
}
