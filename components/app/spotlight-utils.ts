'use client'

import type { SpotlightResource } from '@/components/app/spotlight-data'

export const RECENT_SEARCHES_KEY = 'cerna:recent-searches'
export const RECENT_SEARCHES_MAX = 6

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  return target.getAttribute('contenteditable') === 'true'
}

export function isCommandPaletteShortcut(event: KeyboardEvent) {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? event.metaKey : event.ctrlKey
  if (!mod) return false

  // Spotlight-style shortcut.
  if (event.code === 'Space') return true

  // Fallback shortcut (common in web apps).
  return event.key.toLowerCase() === 'k'
}

export function getOutHref(resourceId: string) {
  return `/app/out/${resourceId}`
}

export function getPrimaryText(r: SpotlightResource) {
  const title = r.title?.trim()
  return title ? title : r.url
}

export function getHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0] || rawUrl
  }
}

export function makeResourceValue(r: SpotlightResource) {
  // Keep filtering useful (cmdk matches against the `value` string).
  // Prefix with id so selection can parse back to the resource id without inline handler logic.
  const searchable = `${getPrimaryText(r)} ${getHost(r.url)} ${r.url}`
  return `${r.id}::${searchable}`
}

export function parseResourceIdFromValue(value: string) {
  const idx = value.indexOf('::')
  return idx === -1 ? value : value.slice(0, idx)
}

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) return parsed.slice(0, RECENT_SEARCHES_MAX)
    return []
  } catch {
    return []
  }
}
