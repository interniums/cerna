import 'server-only'

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string | null
  isAllDay: boolean
  joinUrl: string | null
  openUrl: string | null
}

type GoogleEvent = {
  id?: string
  summary?: string
  htmlLink?: string
  hangoutLink?: string
  description?: string
  location?: string
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>
  }
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

function pickJoinUrl(ev: GoogleEvent) {
  const fromHangout = typeof ev.hangoutLink === 'string' ? ev.hangoutLink : null
  if (fromHangout) return fromHangout

  const entryPoints = ev.conferenceData?.entryPoints ?? []
  for (const ep of entryPoints) {
    if (ep?.entryPointType === 'video' && typeof ep.uri === 'string') return ep.uri
  }

  // Best-effort: look for a URL in location/description.
  const text = [ev.location, ev.description].filter((s): s is string => typeof s === 'string').join('\n')
  const m = text.match(/https?:\/\/\S+/)
  return m ? m[0] : null
}

function parseTime(ev: GoogleEvent) {
  const startDateTime = ev.start?.dateTime ?? null
  const startDate = ev.start?.date ?? null
  const endDateTime = ev.end?.dateTime ?? null
  const endDate = ev.end?.date ?? null

  if (startDateTime) {
    return { start: startDateTime, end: endDateTime, isAllDay: false }
  }
  if (startDate) {
    // All-day events: treat as local-date; store as ISO at midnight UTC for stable rendering.
    const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString()
    const endIso = endDate ? new Date(`${endDate}T00:00:00.000Z`).toISOString() : null
    return { start: startIso, end: endIso, isAllDay: true }
  }

  return { start: new Date().toISOString(), end: null, isAllDay: false }
}

export async function listUpcomingGoogleEvents(input: {
  accessToken: string
  limit: number
  timeMinIso: string
  timeMaxIso: string
}) {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', String(input.limit))
  url.searchParams.set('timeMin', input.timeMinIso)
  url.searchParams.set('timeMax', input.timeMaxIso)

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok || !json || typeof json !== 'object') {
    throw new Error('Google Calendar events request failed.')
  }

  const items = (json as { items?: unknown }).items
  const arr = Array.isArray(items) ? (items as GoogleEvent[]) : []

  return arr
    .filter((e) => typeof e.id === 'string')
    .map((e) => {
      const { start, end, isAllDay } = parseTime(e)
      return {
        id: e.id as string,
        title: typeof e.summary === 'string' && e.summary.trim() ? e.summary : 'Untitled event',
        start,
        end,
        isAllDay,
        joinUrl: pickJoinUrl(e),
        openUrl: typeof e.htmlLink === 'string' ? e.htmlLink : null,
      } satisfies CalendarEvent
    })
}


