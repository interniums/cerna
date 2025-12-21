import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getStripeEnv } from '@/lib/stripe/env'
import { getStripe } from '@/lib/stripe/server'
import { isActiveSubscriptionStatus } from '@/lib/db/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getStripeSignature(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) throw new Error('Missing stripe-signature header.')
  return signature
}

async function upsertEntitlement(input: { userId: string; isActive: boolean }) {
  const supabase = createSupabaseAdminClient()
  const res = await supabase.from('entitlements').upsert(
    {
      user_id: input.userId,
      is_active: input.isActive,
    },
    { onConflict: 'user_id' }
  )
  if (res.error) throw res.error
}

async function upsertSubscription(input: { userId: string; subscription: Stripe.Subscription }) {
  const supabase = createSupabaseAdminClient()
  const priceId = input.subscription.items.data[0]?.price.id ?? input.subscription.items.data[0]?.plan?.id ?? null
  const currentPeriodEndSeconds = input.subscription.items.data[0]?.current_period_end ?? null
  const currentPeriodEndIso = currentPeriodEndSeconds ? new Date(currentPeriodEndSeconds * 1000).toISOString() : null

  const res = await supabase.from('stripe_subscriptions').upsert(
    {
      user_id: input.userId,
      stripe_subscription_id: input.subscription.id,
      status: input.subscription.status,
      current_period_end: currentPeriodEndIso,
      price_id: priceId,
    },
    { onConflict: 'user_id' }
  )
  if (res.error) throw res.error
}

async function upsertStripeCustomer(input: { userId: string; customerId: string }) {
  const supabase = createSupabaseAdminClient()
  const res = await supabase.from('stripe_customers').upsert(
    {
      user_id: input.userId,
      stripe_customer_id: input.customerId,
    },
    { onConflict: 'user_id' }
  )
  if (res.error) throw res.error
}

async function syncSubscriptionById(subscriptionId: string) {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const userId = subscription.metadata?.user_id
  if (!userId) throw new Error('Missing subscription.metadata.user_id.')

  await upsertSubscription({ userId, subscription })
  await upsertEntitlement({
    userId,
    isActive: isActiveSubscriptionStatus(subscription.status),
  })
}

export async function POST(request: Request) {
  const { webhookSecret } = getStripeEnv()
  const signature = getStripeSignature(request)

  const stripe = getStripe()
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id ?? session.client_reference_id ?? null
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

        if (userId && customerId) {
          await upsertStripeCustomer({ userId, customerId })
        }

        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null

        if (subscriptionId) {
          await syncSubscriptionById(subscriptionId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscriptionById(subscription.id)
        break
      }
      default:
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
