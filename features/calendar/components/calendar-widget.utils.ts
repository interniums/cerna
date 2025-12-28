import type { ApiEvent, CalendarProvider } from './calendar-widget.types'

/** Format time for the sidebar list - single-line for better scannability */
export function formatEventSidebarTime(startIso: string, isAllDay: boolean): string {
  if (isAllDay) return 'All day'
  const t = Date.parse(startIso)
  if (!Number.isFinite(t)) return '--:--'
  const d = new Date(t)
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const hour12 = hours % 12 || 12
  const period = hours >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${period}`
}

/** Calculate duration between start and end */
export function formatDuration(startIso: string, endIso: string | null): string | null {
  if (!endIso) return null
  const startMs = Date.parse(startIso)
  const endMs = Date.parse(endIso)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null
  const diffMs = endMs - startMs
  if (diffMs <= 0) return null
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/** Get date label for grouping: "Today", "Tomorrow", or formatted date */
export function getDateLabel(startIso: string): string {
  const t = Date.parse(startIso)
  if (!Number.isFinite(t)) return ''
  const eventDate = new Date(t)
  const now = new Date()

  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)

  if (eventDay.getTime() === today.getTime()) return 'Today'
  if (eventDay.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Group events by date label */
export function groupEventsByDate(events: ApiEvent[]): { label: string; events: ApiEvent[] }[] {
  const groups: Map<string, ApiEvent[]> = new Map()

  for (const event of events) {
    const label = getDateLabel(event.start)
    const existing = groups.get(label)
    if (existing) {
      existing.push(event)
    } else {
      groups.set(label, [event])
    }
  }

  return Array.from(groups.entries()).map(([label, evts]) => ({ label, events: evts }))
}

export function openInNewTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function getPrimaryEventUrl(e: ApiEvent) {
  return e.openUrl ?? e.joinUrl
}

const ACCOUNT_DOT_COLORS = [
  'bg-sky-400',
  'bg-emerald-400',
  'bg-violet-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-cyan-400',
] as const

function hashStringToIndex(value: string, mod: number) {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return mod === 0 ? 0 : h % mod
}

export function getAccountDotClass(accountId: string) {
  return ACCOUNT_DOT_COLORS[hashStringToIndex(accountId, ACCOUNT_DOT_COLORS.length)] ?? 'bg-sky-400'
}

export function getProviderLabel(provider: CalendarProvider) {
  return provider === 'microsoft' ? 'Microsoft' : 'Google'
}
