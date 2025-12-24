'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'

import { isBillingEnabled } from '@/lib/billing/mode'
import { getSiteUrl } from '@/lib/site/url'
import { getSolidgateEnv, getSolidgateProductPriceId } from '@/lib/solidgate/env'
import { solidgateCreatePaymentPage } from '@/lib/solidgate/client'
import { requireServerUser } from '@/lib/supabase/auth'

const PlanSchema = z.object({
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

export async function startCheckoutAction(formData: FormData) {
  if (!isBillingEnabled()) redirect('/app')

  const user = await requireServerUser()

  const parsed = PlanSchema.safeParse({
    interval: formData.get('interval'),
  })
  const interval = parsed.success ? parsed.data.interval : 'monthly'
  const productPriceId = getSolidgateProductPriceId(interval)
  const { trialDays } = getSolidgateEnv()

  const siteUrl = getSiteUrl()

  const orderId = `cerna_${user.id}_${Date.now()}`
  const paymentPage = await solidgateCreatePaymentPage({
    productPriceId,
    trialDays,
    orderId,
    customerEmail: user.email ?? null,
    successUrl: `${siteUrl}/app/subscribe/success`,
    failUrl: `${siteUrl}/app/subscribe`,
    userId: user.id,
  })

  redirect(paymentPage.url)
}
