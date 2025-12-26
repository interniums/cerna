import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

function base64UrlEncode(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function generateCodeVerifier() {
  return base64UrlEncode(randomBytes(32))
}

export function codeChallengeS256(codeVerifier: string) {
  const digest = createHash('sha256').update(codeVerifier, 'utf8').digest()
  return base64UrlEncode(digest)
}


