export type CalendarProvider = 'google' | 'microsoft'

export type ApiEvent = {
  id: string
  title: string
  start: string
  end: string | null
  isAllDay: boolean
  joinUrl: string | null
  openUrl: string | null
  accountId: string
  accountEmail: string
  provider: CalendarProvider
}

export type ApiAccount = {
  id: string
  provider: CalendarProvider
  email: string
  displayName: string | null
  enabled: boolean
  lastError: string | null
}

export type EventsResponse = { ok: true; accounts: ApiAccount[]; events: ApiEvent[] } | { ok: false; message: string }

export type DisconnectDialogState = { open: boolean; account: ApiAccount | null }
