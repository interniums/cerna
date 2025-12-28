import 'server-only'

import { cookies } from 'next/headers'

export async function setOAuthCookies(input: {
  stateCookie: string
  verifierCookie?: string
  returnToCookie: string
  state: string
  verifier?: string
  returnTo: string
  maxAgeSeconds?: number
}) {
  const cookieStore = await cookies()
  const cookieBase = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: input.maxAgeSeconds ?? 10 * 60,
  }

  cookieStore.set(input.stateCookie, input.state, cookieBase)
  if (input.verifierCookie && input.verifier) cookieStore.set(input.verifierCookie, input.verifier, cookieBase)
  cookieStore.set(input.returnToCookie, input.returnTo, cookieBase)
}

export async function readAndClearOAuthCookies(input: {
  stateCookie: string
  verifierCookie?: string
  returnToCookie: string
}) {
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(input.stateCookie)?.value ?? ''
  const verifier = input.verifierCookie ? cookieStore.get(input.verifierCookie)?.value ?? '' : ''
  const returnTo = cookieStore.get(input.returnToCookie)?.value ?? ''

  // Clear ASAP (avoid repeated attempts on refresh).
  cookieStore.set(input.stateCookie, '', { path: '/', maxAge: 0 })
  if (input.verifierCookie) cookieStore.set(input.verifierCookie, '', { path: '/', maxAge: 0 })
  cookieStore.set(input.returnToCookie, '', { path: '/', maxAge: 0 })

  return { expectedState, verifier, returnTo }
}

export function safeReturnTo(value: string | null) {
  if (!value) return '/app'
  if (value.startsWith('/app')) return value
  return '/app'
}


