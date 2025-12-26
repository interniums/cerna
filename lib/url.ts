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
