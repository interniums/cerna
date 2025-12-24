import 'server-only'

import { getSolidgateEnv } from '@/lib/solidgate/env'
import { buildSignaturePayload, generateSignatureHex } from '@/lib/solidgate/signature'

type SolidgateHttpMethod = 'POST' | 'GET'

function getSolidgateApiBaseUrls() {
  const paymentPageBaseUrl =
    process.env.SOLIDGATE_PAYMENT_PAGE_API_BASE_URL ?? 'https://payment-page.solidgate.com/api/v1'
  const subscriptionBaseUrl =
    process.env.SOLIDGATE_SUBSCRIPTION_API_BASE_URL ?? 'https://subscription.solidgate.com/api/v1'

  return {
    paymentPageBaseUrl: paymentPageBaseUrl.replace(/\/$/, ''),
    subscriptionBaseUrl: subscriptionBaseUrl.replace(/\/$/, ''),
  }
}

async function solidgateRequestJson<TResponse>(input: {
  baseUrl: string
  path: string
  method: SolidgateHttpMethod
  body?: unknown
  auth: { merchant: string; secret: string }
}) {
  const url = `${input.baseUrl}${input.path.startsWith('/') ? '' : '/'}${input.path}`
  const bodyString = input.body ? JSON.stringify(input.body) : ''
  const payload = buildSignaturePayload(bodyString)
  const signature = generateSignatureHex({ payload, secret: input.auth.secret })

  const res = await fetch(url, {
    method: input.method,
    headers: {
      'content-type': 'application/json',
      merchant: input.auth.merchant,
      signature,
    },
    body: input.method === 'GET' ? undefined : bodyString,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Solidgate request failed (${res.status}). ${text}`.trim())
  }

  return (await res.json()) as TResponse
}

export async function solidgateCreatePaymentPage(input: {
  productPriceId: string
  trialDays: number
  orderId: string
  customerEmail: string | null
  successUrl: string
  failUrl: string
  // Optional: pass user id for webhook correlation if Solidgate supports custom fields.
  userId: string
}) {
  const env = getSolidgateEnv()
  const { paymentPageBaseUrl } = getSolidgateApiBaseUrls()

  /**
   * NOTE: Solidgate Payment Page payload fields must match Solidgate docs.
   * We keep this minimal and explicit so it’s easy to adjust once confirmed.
   */
  const body = {
    order_id: input.orderId,
    customer_email: input.customerEmail ?? undefined,
    success_url: input.successUrl,
    fail_url: input.failUrl,
    billing: {
      type: 'subscription',
      product_price_id: input.productPriceId,
      trial_days: input.trialDays,
    },
    metadata: {
      user_id: input.userId,
    },
  }

  const res = await solidgateRequestJson<{ url?: string; payment_page_url?: string } & Record<string, unknown>>({
    baseUrl: paymentPageBaseUrl,
    path: '/payment-page/create',
    method: 'POST',
    body,
    auth: { merchant: env.apiPublicKey, secret: env.apiSecretKey },
  })

  const paymentUrl = (res.payment_page_url ?? res.url) as string | undefined
  if (!paymentUrl) {
    throw new Error('Solidgate create payment page response missing url.')
  }

  return { url: paymentUrl }
}

export async function solidgateCancelSubscriptionByCustomer(input: { customerAccountId: string }) {
  const env = getSolidgateEnv()
  const { subscriptionBaseUrl } = getSolidgateApiBaseUrls()

  return await solidgateRequestJson<Record<string, unknown>>({
    baseUrl: subscriptionBaseUrl,
    path: '/subscription/cancel-by-customer',
    method: 'POST',
    body: { customer_account_id: input.customerAccountId },
    auth: { merchant: env.apiPublicKey, secret: env.apiSecretKey },
  })
}
