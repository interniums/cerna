import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ONE_WEEK_S = 60 * 60 * 24 * 7
const ONE_MONTH_S = 60 * 60 * 24 * 30
const FETCH_TIMEOUT_MS = 2500
const MAX_ICON_BYTES = 256 * 1024

function cacheControlHeaderValue() {
  return `public, max-age=${ONE_WEEK_S}, stale-while-revalidate=${ONE_MONTH_S}`
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false

  const [a, b] = nums
  // 10.0.0.0/8
  if (a === 10) return true
  // 127.0.0.0/8
  if (a === 127) return true
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true
  // 0.0.0.0/8
  if (a === 0) return true
  return false
}

function isIpv4Literal(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

function isIpv6Literal(host: string) {
  // URL.hostname for IPv6 literals is returned without brackets in WHATWG URL.
  return /^[0-9a-f:]+$/i.test(host) && host.includes(':')
}

function isPrivateIpv6(host: string) {
  const h = host.toLowerCase()
  if (h === '::1') return true
  if (h.startsWith('fe80:')) return true // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true // unique local
  return false
}

function isBlockedHostname(hostname: string) {
  const h = hostname.trim().toLowerCase()
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (isIpv4Literal(h)) return isPrivateIpv4(h)
  if (isIpv6Literal(h)) return isPrivateIpv6(h)
  return false
}

function sanitizeDomain(input: string) {
  const raw = input.trim().toLowerCase()
  const noWww = raw.replace(/^www\./, '')
  const trimmed = noWww.slice(0, 255)
  // Keep it boring: hostnames only.
  if (!trimmed) return ''
  if (!/^[a-z0-9.-]+$/.test(trimmed)) return ''
  // Avoid weird edge cases.
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) return ''
  return trimmed
}

function domainFromUrlParam(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return sanitizeDomain(u.hostname)
  } catch {
    return ''
  }
}

function parseIconUrl(raw: string) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (isBlockedHostname(u.hostname)) return null
    return u
  } catch {
    return null
  }
}

async function readResponseBytesWithLimit(res: Response, limit: number) {
  const lenHeader = res.headers.get('content-length')
  if (lenHeader) {
    const asNum = Number(lenHeader)
    if (Number.isFinite(asNum) && asNum > limit) return null
  }

  const reader = res.body?.getReader()
  if (!reader) {
    const ab = await res.arrayBuffer()
    return ab.byteLength > limit ? null : ab
  }

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > limit) return null
    chunks.push(value)
  }

  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out.buffer
}

function hashString(input: string) {
  // Simple deterministic 32-bit hash.
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function fallbackSvg(domain: string) {
  const label = domain || 'link'
  const letter = (label.replace(/[^a-z0-9]/gi, '').slice(0, 1) || '?').toUpperCase()
  const hue = hashString(label) % 360
  const bg = `hsl(${hue} 55% 42%)`
  const fg = 'white'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${label}">
  <rect x="0" y="0" width="64" height="64" rx="14" fill="${bg}"/>
  <text x="32" y="40" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="30" font-weight="700" fill="${fg}">${letter}</text>
</svg>`
}

function svgResponse(svg: string) {
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': cacheControlHeaderValue(),
    },
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawIconUrl = searchParams.get('iconUrl')
  const rawDomain = searchParams.get('domain')
  const rawUrl = searchParams.get('url')

  const iconUrl = rawIconUrl ? parseIconUrl(rawIconUrl) : null

  if (iconUrl) {
    const label = iconUrl.hostname.replace(/^www\./, '')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(iconUrl.toString(), {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        // Server-side caching/dedupe
        next: { revalidate: ONE_WEEK_S },
        headers: {
          'user-agent': 'CernaFaviconProxy/1.0 (+https://cerna.app)',
          accept: 'image/*,*/*;q=0.8',
        },
      })

      const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
      const okType = contentType.startsWith('image/') || contentType.includes('icon')
      if (!res.ok || !okType) {
        return svgResponse(fallbackSvg(label))
      }

      const bytes = await readResponseBytesWithLimit(res, MAX_ICON_BYTES)
      if (!bytes) return svgResponse(fallbackSvg(label))

      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'content-type': contentType || 'image/x-icon',
          'cache-control': cacheControlHeaderValue(),
        },
      })
    } catch {
      return svgResponse(fallbackSvg(label))
    } finally {
      clearTimeout(timeout)
    }
  }

  const domain = rawDomain ? sanitizeDomain(rawDomain) : rawUrl ? domainFromUrlParam(rawUrl) : ''

  // Always return an image (even for invalid/missing input) to avoid broken <img> UI.
  if (!domain) {
    return svgResponse(fallbackSvg(''))
  }

  const googleUrl = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`

  try {
    const res = await fetch(googleUrl, {
      method: 'GET',
      // Let Next/Vercel dedupe this server-side too.
      next: { revalidate: ONE_WEEK_S },
      headers: {
        // Avoid default UA blocks (rare here, but cheap).
        'user-agent': 'CernaFaviconProxy/1.0 (+https://cerna.app)',
      },
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok || !contentType.startsWith('image/')) {
      return svgResponse(fallbackSvg(domain))
    }

    const bytes = await readResponseBytesWithLimit(res, MAX_ICON_BYTES)
    if (!bytes) return svgResponse(fallbackSvg(domain))
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': cacheControlHeaderValue(),
      },
    })
  } catch {
    return svgResponse(fallbackSvg(domain))
  }
}


