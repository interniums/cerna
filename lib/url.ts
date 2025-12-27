export function getHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0] || rawUrl
  }
}

export function getFaviconServiceUrl(rawUrl: string) {
  const host = getHost(rawUrl)
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`
}

export function getFaviconProxyUrl(rawUrl: string) {
  const domain = getHost(rawUrl)
  return `/api/favicon?domain=${encodeURIComponent(domain)}`
}

export function getFaviconProxyUrlFromIconUrl(iconUrl: string) {
  return `/api/favicon?iconUrl=${encodeURIComponent(iconUrl)}`
}

export function getResourceFaviconSrc(input: { url: string | null; favicon_url: string | null }) {
  const icon = input.favicon_url?.trim()
  if (icon) return getFaviconProxyUrlFromIconUrl(icon)

  const url = input.url?.trim()
  if (url) return getFaviconProxyUrl(url)

  return null
}

export type UrlFieldRequirement = 'required' | 'optional'

export type UrlValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

/**
 * Validates user-entered URLs for form inputs.
 * - Trims whitespace
 * - Requires http(s) scheme
 * - Caps length at 2048 chars
 */
export function validateHttpUrlInput(raw: string, requirement: UrlFieldRequirement): UrlValidationResult {
  const value = String(raw ?? '').trim()

  if (!value) {
    if (requirement === 'required') return { ok: false, message: 'URL is required.' }
    return { ok: true, value: '' }
  }

  if (value.length > 2048) return { ok: false, message: 'Link is too long.' }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, message: 'Please enter a valid URL (include https://).' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: 'Please use an http(s) URL.' }
  }

  return { ok: true, value }
}