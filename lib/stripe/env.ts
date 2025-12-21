export function getStripeEnv() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY.')
  if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET.')

  return { secretKey, webhookSecret }
}

export type StripeBillingInterval = 'monthly' | 'yearly'

export function getStripePriceId(interval: StripeBillingInterval) {
  // Preferred: separate prices.
  const monthly = process.env.STRIPE_PRICE_ID_MONTHLY
  const yearly = process.env.STRIPE_PRICE_ID_YEARLY

  if (monthly && yearly) {
    return interval === 'yearly' ? yearly : monthly
  }

  // Backwards compatibility: single price.
  const legacy = process.env.STRIPE_PRICE_ID
  if (legacy) return legacy

  throw new Error(
    'Missing Stripe Price env. Set STRIPE_PRICE_ID_MONTHLY + STRIPE_PRICE_ID_YEARLY (recommended), or STRIPE_PRICE_ID (legacy).'
  )
}
