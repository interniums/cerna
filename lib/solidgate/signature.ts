import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Solidgate uses signature verification similar to API auth. The docs emphasize:
 * - Use raw JSON body exactly as received
 * - Signature is derived from webhook public+secret keys
 *
 * We implement an HMAC helper and constant-time compare; the exact input string
 * format must match Solidgate docs. If Solidgate requires additional inputs
 * (e.g., merchant key concatenation), adjust `buildSignaturePayload`.
 */

export function buildSignaturePayload(rawBody: string) {
  // Default: raw body only. Adjust if Solidgate specifies a different payload.
  return rawBody
}

export function generateSignatureHex(input: { payload: string; secret: string }) {
  return createHmac('sha256', input.secret).update(input.payload, 'utf8').digest('hex')
}

export function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}
