import 'server-only'

export type BillingProvider = 'disabled' | 'lemon'

export function getBillingProvider(): BillingProvider {
  const raw = process.env.BILLING_PROVIDER

  if (!raw) return 'disabled'
  if (raw === 'disabled' || raw === 'lemon') return raw

  // Fail closed in production, but keep local/dev from crashing on typos.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Invalid BILLING_PROVIDER value: ${raw}`)
  }
  return 'disabled'
}

export function isBillingEnabled() {
  return getBillingProvider() !== 'disabled'
}
