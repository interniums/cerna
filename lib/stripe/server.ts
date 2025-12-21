import 'server-only'

import Stripe from 'stripe'

import { getStripeEnv } from '@/lib/stripe/env'

let stripeSingleton: Stripe | null = null

export function getStripe() {
  if (stripeSingleton) return stripeSingleton

  const { secretKey } = getStripeEnv()
  stripeSingleton = new Stripe(secretKey, {
    typescript: true,
  })

  return stripeSingleton
}
