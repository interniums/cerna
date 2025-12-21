'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'

import { getOrCreateStripeCustomerId } from '@/lib/db/stripe'
import { getSiteUrl } from '@/lib/site/url'
import { getStripePriceId } from '@/lib/stripe/env'
import { getStripe } from '@/lib/stripe/server'
import { requireServerUser } from '@/lib/supabase/auth'

const PlanSchema = z.object({
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

export async function startCheckoutAction(formData: FormData) {
  const user = await requireServerUser()
  const stripe = getStripe()

  const parsed = PlanSchema.safeParse({
    interval: formData.get('interval'),
  })
  const interval = parsed.success ? parsed.data.interval : 'monthly'
  const priceId = getStripePriceId(interval)

  const customerId = await getOrCreateStripeCustomerId({
    userId: user.id,
    email: user.email ?? null,
  })

  const siteUrl = getSiteUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { user_id: user.id },
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/app/subscribe/success`,
    cancel_url: `${siteUrl}/app/subscribe`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
  })

  if (!session.url) {
    throw new Error('Stripe checkout session missing url.')
  }

  redirect(session.url)
}
