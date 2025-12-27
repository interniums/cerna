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

type GoogleCalendarListEntry = {
  id?: string
  primary?: boolean
  selected?: boolean
  hidden?: boolean
  summary?: string
}

type GoogleEvent = {
  id?: string
  iCalUID?: string
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

async function fetchJson(input: { url: URL; accessToken: string }) {
  const res = await fetch(input.url, {
    headers: { authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => null)) as unknown

  if (!res.ok) {
    const message =
      json && typeof json === 'object'
        ? (json as { error?: { message?: unknown } }).error?.message
        : null
    const msg = typeof message === 'string' && message.trim() ? message : 'Google Calendar request failed.'
    throw new Error(`[google-calendar] ${res.status} ${msg} (${input.url.pathname})`)
  }

  if (!json || typeof json !== 'object') {
    throw new Error(`[google-calendar] ${res.status} Invalid JSON response (${input.url.pathname})`)
  }

  return json
}

async function listCalendarIds(input: { accessToken: string }) {
  const url = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList')
  url.searchParams.set('minAccessRole', 'reader')
  // Keep payload small; we only need a few fields.
  url.searchParams.set('fields', 'items(id,primary,selected,hidden)')

  const json = (await fetchJson({ url, accessToken: input.accessToken })) as { items?: unknown }
  const arr = Array.isArray(json.items) ? (json.items as GoogleCalendarListEntry[]) : []

  const hasPrimary = arr.some((c) => Boolean(c.primary) === true && typeof c.id === 'string')

  const calendars = arr
    .filter((c) => typeof c.id === 'string')
    // Default to calendars the user has selected in Google Calendar UI.
    .filter((c) => Boolean(c.hidden) === false)
    .filter((c) => Boolean(c.selected) === true || Boolean(c.primary) === true)
    .map((c) => c.id as string)

  // Include the 'primary' alias only when the calendar list didn't include a primary id.
  // Otherwise we'd fetch the same calendar twice (real id + alias) and show duplicates.
  if (!hasPrimary) calendars.unshift('primary')

  // Avoid pathological fan-out for users with lots of selected calendars.
  return calendars.slice(0, 10)
}

async function listEventsForCalendar(input: {
  accessToken: string
  calendarId: string
  perCalendarLimit: number
  timeMinIso: string
  timeMaxIso: string
}) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', String(input.perCalendarLimit))
  url.searchParams.set('timeMin', input.timeMinIso)
  url.searchParams.set('timeMax', input.timeMaxIso)
  // Ensure conference data is included for Meet links (join URLs).
  url.searchParams.set('conferenceDataVersion', '1')
  // Keep payload small.
  url.searchParams.set(
    'fields',
    'items(id,iCalUID,summary,htmlLink,hangoutLink,description,location,conferenceData(entryPoints(uri,entryPointType)),start(dateTime,date),end(dateTime,date))'
  )

  const json = (await fetchJson({ url, accessToken: input.accessToken })) as { items?: unknown }
  const items = Array.isArray(json.items) ? (json.items as GoogleEvent[]) : []

  return items
    .filter((e) => typeof e.id === 'string')
    .map((e) => {
      const { start, end, isAllDay } = parseTime(e)
      const ical = typeof e.iCalUID === 'string' && e.iCalUID.trim() ? e.iCalUID.trim() : null
      return {
        // iCalUID is stable across calendars but shared across recurring instances,
        // so include start time to keep instances distinct.
        id: ical ? `${ical}:${start}` : `${input.calendarId}:${e.id as string}`,
        title: typeof e.summary === 'string' && e.summary.trim() ? e.summary : 'Untitled event',
        start,
        end,
        isAllDay,
        joinUrl: pickJoinUrl(e),
        openUrl: typeof e.htmlLink === 'string' ? e.htmlLink : null,
      } satisfies CalendarEvent
    })
}

export async function listUpcomingGoogleEvents(input: {
  accessToken: string
  limit: number
  timeMinIso: string
  timeMaxIso: string
}) {
  const perCalendarLimit = Math.min(25, Math.max(10, input.limit))

  // Many users schedule meetings on non-primary calendars (Work/Team/etc).
  // So we merge events across the calendars they have selected in Google Calendar UI.
  let calendarIds: string[]
  try {
    calendarIds = await listCalendarIds({ accessToken: input.accessToken })
  } catch {
    // Fallback: still try primary if calendarList fails.
    calendarIds = ['primary']
  }

  const all: CalendarEvent[] = []
  const seen = new Set<string>()
  let firstError: unknown = null
  for (const calendarId of calendarIds) {
    try {
      const events = await listEventsForCalendar({
        accessToken: input.accessToken,
        calendarId,
        perCalendarLimit,
        timeMinIso: input.timeMinIso,
        timeMaxIso: input.timeMaxIso,
      })
      for (const e of events) {
        // De-dupe across calendars: the same meeting can appear in multiple calendars
        // (e.g. primary + subscribed calendar). Our event id uses iCalUID + start when available.
        const key = e.id
        if (seen.has(key)) continue
        seen.add(key)
        all.push(e)
      }
    } catch (e: unknown) {
      // Be resilient: a single calendar failure shouldn't hide all events.
      // This commonly happens with stale/hidden calendars or partial permissions.
      if (!firstError) firstError = e
      continue
    }
  }

  // If every calendar failed, surface a real error so the UI can show a helpful message.
  if (all.length === 0 && firstError) {
    throw firstError instanceof Error ? firstError : new Error('Google Calendar request failed.')
  }

  all.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return all.slice(0, input.limit)
}


