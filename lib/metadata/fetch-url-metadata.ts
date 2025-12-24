import 'server-only'

import * as cheerio from 'cheerio'

export type UrlMetadata = {
  title?: string
  description?: string
  faviconUrl?: string
  imageUrl?: string
}

function absolutize(baseUrl: string, maybeRelative: string | undefined | null) {
  if (!maybeRelative) return undefined
  try {
    return new URL(maybeRelative, baseUrl).toString()
  } catch {
    return undefined
  }
}

function pickFirst(...values: Array<string | undefined | null>) {
  for (const v of values) {
    const trimmed = v?.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

export async function fetchUrlMetadata(input: { url: string; timeoutMs?: number }): Promise<UrlMetadata> {
  const timeoutMs = input.timeoutMs ?? 1800

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(input.url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Some sites block default fetch UA.
        'user-agent': 'CernaMetadataBot/1.0 (+https://cerna.app)',
        accept: 'text/html,application/xhtml+xml',
      },
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok) return {}
    if (!contentType.includes('text/html')) return {}

    const html = await res.text()
    const $ = cheerio.load(html)

    const ogTitle = $('meta[property="og:title"]').attr('content')
    const ogDesc = $('meta[property="og:description"]').attr('content')
    const ogImage = $('meta[property="og:image"]').attr('content')
    const ogImageSecure = $('meta[property="og:image:secure_url"]').attr('content')
    const ogImageUrl = $('meta[property="og:image:url"]').attr('content')
    const twitterImage =
      $('meta[name="twitter:image"]').attr('content') || $('meta[property="twitter:image"]').attr('content')
    const twitterImageSrc =
      $('meta[name="twitter:image:src"]').attr('content') || $('meta[property="twitter:image:src"]').attr('content')
    const metaDesc = $('meta[name="description"]').attr('content')
    const titleTag = $('title').first().text()

    const icon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href')

    const title = pickFirst(ogTitle, titleTag)
    const description = pickFirst(ogDesc, metaDesc)

    return {
      title,
      description,
      faviconUrl: absolutize(input.url, icon),
      imageUrl: absolutize(input.url, pickFirst(ogImageSecure, ogImageUrl, ogImage, twitterImage, twitterImageSrc)),
    }
  } catch {
    return {}
  } finally {
    clearTimeout(timeout)
  }
}
