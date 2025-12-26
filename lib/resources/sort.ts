import type { Resource } from '@/lib/db/resources'

function parseDateMs(value: string | null): number {
  if (!value) return NaN
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : NaN
}

function compareNumberAsc(a: number, b: number) {
  return a - b
}

function compareNumberDesc(a: number, b: number) {
  return b - a
}

function compareStringAsc(a: string, b: string) {
  return a.localeCompare(b)
}

/**
 * Canonical ordering for resources in default lists (All/Category/Pinned).
 *
 * Important: intentionally does NOT use `updated_at`, so edits / essentials toggles
 * do not reorder lists. Only pin/unpin + visits affect ordering.
 */
export function compareResourcesDefault(a: Resource, b: Resource) {
  // Pinned first.
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

  // Within pinned: chronological (oldest first). Nulls last.
  const aPinnedAt = parseDateMs(a.pinned_at)
  const bPinnedAt = parseDateMs(b.pinned_at)
  const aPinnedMissing = !Number.isFinite(aPinnedAt)
  const bPinnedMissing = !Number.isFinite(bPinnedAt)
  if (aPinnedMissing !== bPinnedMissing) return aPinnedMissing ? 1 : -1
  if (!aPinnedMissing && aPinnedAt !== bPinnedAt) return compareNumberAsc(aPinnedAt, bPinnedAt)

  // Recency: more recently visited first. Nulls last.
  const aLast = parseDateMs(a.last_visited_at)
  const bLast = parseDateMs(b.last_visited_at)
  const aLastMissing = !Number.isFinite(aLast)
  const bLastMissing = !Number.isFinite(bLast)
  if (aLastMissing !== bLastMissing) return aLastMissing ? 1 : -1
  if (!aLastMissing && aLast !== bLast) return compareNumberDesc(aLast, bLast)

  // More frequently visited first.
  if (a.visit_count !== b.visit_count) return compareNumberDesc(a.visit_count, b.visit_count)

  // Newer creations first (stable default when there's no visit history).
  const aCreated = parseDateMs(a.created_at)
  const bCreated = parseDateMs(b.created_at)
  if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
    return compareNumberDesc(aCreated, bCreated)
  }

  // Final deterministic tie-breaker (never return 0 for distinct rows).
  return compareStringAsc(a.id, b.id)
}

/**
 * Canonical ordering for “Recent” mode (unpinned only).
 */
export function compareResourcesRecent(a: Resource, b: Resource) {
  // Newest visit first. Nulls last.
  const aLast = parseDateMs(a.last_visited_at)
  const bLast = parseDateMs(b.last_visited_at)
  const aLastMissing = !Number.isFinite(aLast)
  const bLastMissing = !Number.isFinite(bLast)
  if (aLastMissing !== bLastMissing) return aLastMissing ? 1 : -1
  if (!aLastMissing && aLast !== bLast) return compareNumberDesc(aLast, bLast)

  // Then newest created first.
  const aCreated = parseDateMs(a.created_at)
  const bCreated = parseDateMs(b.created_at)
  if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
    return compareNumberDesc(aCreated, bCreated)
  }

  return compareStringAsc(a.id, b.id)
}


