import 'server-only'

import type { CalendarEvent } from '@/lib/integrations/google-calendar/events'

type GraphEvent = {
  id?: string
  subject?: string
  webLink?: string
  start?: { dateTime?: string; timeZone?: string }
  end?: { dateTime?: string; timeZone?: string }
  isAllDay?: boolean
  onlineMeetingUrl?: string
  onlineMeeting?: { joinUrl?: string }
}

export async function listUpcomingMicrosoftEvents(input: {
  accessToken: string
  limit: number
  timeMinIso: string
  timeMaxIso: string
}) {
  const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView')
  url.searchParams.set('startDateTime', input.timeMinIso)
  url.searchParams.set('endDateTime', input.timeMaxIso)
  url.searchParams.set('$top', String(input.limit))
  url.searchParams.set('$orderby', 'start/dateTime')
  url.searchParams.set('$select', 'id,subject,webLink,start,end,isAllDay,onlineMeetingUrl,onlineMeeting')

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      // Normalize times for simple sorting/formatting on the client.
      Prefer: 'outlook.timezone="UTC"',
    },
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') {
    const retryAfterRaw = res.headers.get('Retry-After')
    const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : null
    const message =
      json && typeof json === 'object'
        ? (json as { error?: { message?: unknown } }).error?.message
        : null
    const msg = typeof message === 'string' && message.trim() ? message : 'Microsoft Calendar request failed.'
    const retryNote = Number.isFinite(retryAfterSec) && (retryAfterSec as number) > 0 ? ` retry-after=${retryAfterSec}s` : ''
    throw new Error(`[microsoft-calendar] ${res.status} ${msg}${retryNote}`)
  }

  const value = (json as { value?: unknown }).value
  const arr = Array.isArray(value) ? (value as GraphEvent[]) : []

  return arr
    .filter((e) => typeof e.id === 'string')
    .map((e) => {
      const start = typeof e.start?.dateTime === 'string' ? e.start.dateTime : new Date().toISOString()
      const end = typeof e.end?.dateTime === 'string' ? e.end.dateTime : null
      const isAllDay = Boolean(e.isAllDay)
      const joinUrl =
        (typeof e.onlineMeeting?.joinUrl === 'string' && e.onlineMeeting.joinUrl) ||
        (typeof e.onlineMeetingUrl === 'string' && e.onlineMeetingUrl) ||
        null

      return {
        id: e.id as string,
        title: typeof e.subject === 'string' && e.subject.trim() ? e.subject : 'Untitled event',
        start,
        end,
        isAllDay,
        joinUrl,
        openUrl: typeof e.webLink === 'string' ? e.webLink : null,
      } satisfies CalendarEvent
    })
}


