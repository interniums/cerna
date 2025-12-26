import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function base64UrlEncode(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64')
}

function getKey() {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) throw new Error('Missing APP_ENCRYPTION_KEY.')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be base64-encoded 32 bytes.')
  return key
}

// AES-256-GCM: token format "v1.<iv>.<ciphertext>.<tag>" (all base64url)
export function encryptSecret(plaintext: string) {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(ciphertext)}.${base64UrlEncode(tag)}`
}

export function decryptSecret(token: string) {
  const key = getKey()
  const [v, ivB64, ctB64, tagB64] = token.split('.')
  if (v !== 'v1' || !ivB64 || !ctB64 || !tagB64) throw new Error('Invalid secret format.')

  const iv = base64UrlDecode(ivB64)
  const ciphertext = base64UrlDecode(ctB64)
  const tag = base64UrlDecode(tagB64)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}


