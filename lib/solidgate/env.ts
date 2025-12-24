import 'server-only'

type SolidgateInterval = 'monthly' | 'yearly'

export function getSolidgateEnv() {
  const apiPublicKey = process.env.SOLIDGATE_API_PUBLIC_KEY
  const apiSecretKey = process.env.SOLIDGATE_API_SECRET_KEY
  const webhookPublicKey = process.env.SOLIDGATE_WEBHOOK_PUBLIC_KEY
  const webhookSecretKey = process.env.SOLIDGATE_WEBHOOK_SECRET_KEY

  const monthlyPriceId = process.env.SOLIDGATE_PRODUCT_PRICE_ID_MONTHLY
  const yearlyPriceId = process.env.SOLIDGATE_PRODUCT_PRICE_ID_YEARLY

  const trialDaysRaw = process.env.SOLIDGATE_TRIAL_DAYS

  if (!apiPublicKey) throw new Error('Missing SOLIDGATE_API_PUBLIC_KEY.')
  if (!apiSecretKey) throw new Error('Missing SOLIDGATE_API_SECRET_KEY.')
  if (!webhookPublicKey) throw new Error('Missing SOLIDGATE_WEBHOOK_PUBLIC_KEY.')
  if (!webhookSecretKey) throw new Error('Missing SOLIDGATE_WEBHOOK_SECRET_KEY.')
  if (!monthlyPriceId) throw new Error('Missing SOLIDGATE_PRODUCT_PRICE_ID_MONTHLY.')
  if (!yearlyPriceId) throw new Error('Missing SOLIDGATE_PRODUCT_PRICE_ID_YEARLY.')

  const trialDays = Number(trialDaysRaw)
  if (!Number.isFinite(trialDays) || trialDays <= 0) {
    throw new Error('Missing/invalid SOLIDGATE_TRIAL_DAYS (must be a positive number).')
  }

  return {
    apiPublicKey,
    apiSecretKey,
    webhookPublicKey,
    webhookSecretKey,
    monthlyPriceId,
    yearlyPriceId,
    trialDays,
  }
}

export function getSolidgateProductPriceId(interval: SolidgateInterval) {
  const { monthlyPriceId, yearlyPriceId } = getSolidgateEnv()
  return interval === 'yearly' ? yearlyPriceId : monthlyPriceId
}
