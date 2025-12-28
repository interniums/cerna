'use client'

import Link from 'next/link'
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react'
import { toast } from 'sonner'
import { ExternalLink, Link2, RefreshCcw, Settings2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  disconnectCalendarAccountAction,
  toggleWorkflowCalendarVisibilityAction,
  type CalendarActionState,
} from '@/features/calendar/actions'

import { CalendarAccountsDialog } from './calendar-accounts-dialog'
import type { ApiAccount, ApiEvent, DisconnectDialogState, EventsResponse } from './calendar-widget.types'
import {
  formatDuration,
  formatEventSidebarTime,
  getAccountDotClass,
  getPrimaryEventUrl,
  getProviderLabel,
  groupEventsByDate,
  openInNewTab,
} from './calendar-widget.utils'

const initialState: CalendarActionState = { ok: false, message: '', nonce: 0 }

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn('size-4', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21.6 12.27c0-.76-.07-1.49-.2-2.18H12v4.12h5.38a4.6 4.6 0 0 1-2 3.01v2.7h3.24c1.9-1.75 2.98-4.33 2.98-7.65Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.24-2.7c-.9.61-2.05.97-3.37.97-2.6 0-4.8-1.75-5.58-4.1H3.07v2.79A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.42 13.73A6 6 0 0 1 6.1 12c0-.6.11-1.18.31-1.73V7.48H3.07A10 10 0 0 0 2 12c0 1.62.39 3.15 1.07 4.52l3.35-2.79Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.17c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 3.18 14.7 2 12 2A10 10 0 0 0 3.07 7.48l3.35 2.79c.78-2.35 2.98-4.1 5.58-4.1Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn('size-4', className)} xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3h8v8H3V3Z" fill="#F25022" />
      <path d="M13 3h8v8h-8V3Z" fill="#7FBA00" />
      <path d="M3 13h8v8H3v-8Z" fill="#00A4EF" />
      <path d="M13 13h8v8h-8v-8Z" fill="#FFB900" />
    </svg>
  )
}

function CalendarEventSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-md px-2 py-2">
      {/* Time column - matches: w-10, stacked time + period */}
      <div className="w-10 shrink-0 self-center text-center">
        <Skeleton className="h-5 w-9 mx-auto" />
        <Skeleton className="h-4 w-5 mx-auto" />
      </div>

      <div className="min-w-0 flex-1">
        {/* Title */}
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4 mt-0.5" />

        {/* Meta line */}
        <div className="mt-0.5 flex items-center gap-1.5">
          <div className="size-4 flex items-center justify-center shrink-0">
            <Skeleton className="size-2.5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>

      {/* Actions slot */}
      <div className="hidden sm:flex shrink-0 items-center gap-1">
        <Skeleton className="size-7 rounded-md" />
      </div>
    </div>
  )
}

function CalendarWidgetSkeleton() {
  // Matches the real EventsList + DateHeader + CalendarEventRow layout exactly
  return (
    <div className="flex flex-col gap-1">
      {/* First group - matches EventsList structure */}
      <div>
        {/* DateHeader skeleton - same classes as real DateHeader */}
        <div className="px-2 pt-2 pb-1 first:pt-0">
          <Skeleton className="h-4 w-12" />
        </div>
        {/* Events container - matches: flex flex-col gap-1 */}
        <div className="flex flex-col gap-1">
          <CalendarEventSkeleton />
          <CalendarEventSkeleton />
          <CalendarEventSkeleton />
        </div>
      </div>
    </div>
  )
}

function DateHeader({ label }: { label: string }) {
  return (
    <div className="px-2 pt-2 pb-1 first:pt-0">
      <p className="text-[11px] leading-4 font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function EventsList({ events }: { events: ApiEvent[] }) {
  const groupedEvents = useMemo(() => groupEventsByDate(events), [events])

  return (
    <div className="flex flex-col gap-1">
      {groupedEvents.map((group, idx) => (
        <div key={`${group.label}:${idx}`}>
          <DateHeader label={group.label} />
          <div className="flex flex-col gap-1">
            {group.events.map((e) => (
              <CalendarEventRow key={`${e.accountId}:${e.id}`} event={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarEventRow({ event }: { event: ApiEvent }) {
  const primaryUrl = getPrimaryEventUrl(event)
  const isClickable = Boolean(primaryUrl)
  const displayTime = formatEventSidebarTime(event.start, event.isAllDay)
  const providerLabel = getProviderLabel(event.provider)
  const dotClassName = getAccountDotClass(event.accountId)
  const duration = formatDuration(event.start, event.end)

  const handleRowClick = useCallback(() => {
    if (!primaryUrl) return
    openInNewTab(primaryUrl)
  }, [primaryUrl])

  const handleJoinClick = useCallback(() => {
    if (!event.joinUrl) return
    openInNewTab(event.joinUrl)
  }, [event.joinUrl])

  const handleOpenClick = useCallback(() => {
    if (!event.openUrl) return
    openInNewTab(event.openUrl)
  }, [event.openUrl])

  const handleRowKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLDivElement>) => {
      if (!primaryUrl) return
      if (ev.key !== 'Enter' && ev.key !== ' ') return
      ev.preventDefault()
      openInNewTab(primaryUrl)
    },
    [primaryUrl]
  )

  const stopRowClickPropagation = useCallback((ev: SyntheticEvent) => {
    ev.stopPropagation()
  }, [])

  return (
    <div
      role={isClickable ? 'link' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open calendar event: ${event.title}` : undefined}
      className={cn(
        'group flex min-w-0 items-start gap-3 rounded-md px-2 py-2 transition-colors focus-within:ring-1 focus-within:ring-ring/40',
        isClickable
          ? 'cursor-pointer hover:bg-accent/40 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          : ''
      )}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      {/* Time column - single line for scanability */}
      <div className="w-[76px] shrink-0 self-center text-center">
        <p className="whitespace-nowrap text-sm font-mono text-muted-foreground leading-5">{displayTime}</p>
      </div>

      {/* Content - flexible, allows wrapping */}
      <div className="min-w-0 flex-1">
        {/* Title - semibold for visual hierarchy, allow 2 lines */}
        <p className="text-sm font-semibold text-foreground leading-5 line-clamp-2">{event.title}</p>

        {/* Metadata row - provider + duration (no redundant time) */}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs leading-4 text-foreground/60">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full"
                aria-label={`Calendar account: ${event.accountEmail}`}
                onClick={stopRowClickPropagation}
                onKeyDown={stopRowClickPropagation}
              >
                <span className={cn('size-2.5 rounded-full ring-1 ring-border/60', dotClassName)} />
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{event.accountEmail}</TooltipContent>
          </Tooltip>
          <span>{providerLabel}</span>
          {duration ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{duration}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Hover-only actions - visible on larger screens */}
      <div
        className="hidden sm:flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        onClick={stopRowClickPropagation}
        onKeyDown={stopRowClickPropagation}
      >
        {event.joinUrl ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Join meeting" onClick={handleJoinClick}>
            <Link2 aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
        {event.openUrl ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Open event" onClick={handleOpenClick}>
            <ExternalLink aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function CalendarWidget({ workflowId }: { workflowId: string }) {
  const [open, setOpen] = useState(false)
  const [disconnectDialog, setDisconnectDialog] = useState<DisconnectDialogState>({ open: false, account: null })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [events, setEvents] = useState<ApiEvent[]>([])

  const [toggleState, toggleAction] = useActionState(toggleWorkflowCalendarVisibilityAction, initialState)
  const [disconnectState, disconnectAction] = useActionState(disconnectCalendarAccountAction, initialState)

  const connected = accounts.length > 0
  const anyEnabled = accounts.some((a) => a.enabled)
  const hasGoogleAccount = accounts.some((a) => a.provider === 'google')
  const hasMicrosoftAccount = accounts.some((a) => a.provider === 'microsoft')
  const connectGoogleLabel = hasGoogleAccount ? 'Add Google account' : 'Connect Google'
  const connectMicrosoftLabel = hasMicrosoftAccount ? 'Add Microsoft account' : 'Connect Microsoft'
  const enabledErrors = useMemo(() => {
    return accounts
      .filter((a) => a.enabled && a.lastError)
      .map((a) => ({ id: a.id, provider: a.provider, email: a.email, lastError: a.lastError as string }))
  }, [accounts])

  const refetch = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (mode === 'initial') {
        setLoading(true)
        setError(null)
        setRefreshError(null)
      } else {
        setRefreshing(true)
        setRefreshError(null)
      }
      try {
        const res = await fetch(`/api/calendar/events?workflowId=${encodeURIComponent(workflowId)}`, {
          cache: 'no-store',
        })
        const json = (await res.json().catch(() => null)) as EventsResponse | null
        if (!json || !json.ok) {
          const msg = json && !json.ok ? json.message : 'Couldn’t load calendar.'
          if (mode === 'initial') {
            setError(msg)
            setAccounts([])
            setEvents([])
          } else {
            setRefreshError(msg)
          }
        } else {
          setAccounts(json.accounts)
          setEvents(json.events)
        }
      } catch {
        const msg = 'Couldn’t load calendar.'
        if (mode === 'initial') {
          setError(msg)
          setAccounts([])
          setEvents([])
        } else {
          setRefreshError(msg)
        }
      } finally {
        if (mode === 'initial') setLoading(false)
        else setRefreshing(false)
      }
    },
    [workflowId]
  )

  useEffect(() => {
    void refetch('initial')
  }, [refetch])

  useEffect(() => {
    if (!toggleState.ok) return
    void refetch('refresh')
  }, [refetch, toggleState.nonce, toggleState.ok])

  useEffect(() => {
    if (!disconnectState.ok) return
    toast('Disconnected.')
    setDisconnectDialog({ open: false, account: null })
    void refetch('refresh')
  }, [disconnectState.nonce, disconnectState.ok, refetch])

  const settingsSummary = useMemo(() => {
    const enabledCount = accounts.filter((a) => a.enabled).length
    if (accounts.length === 0) return 'No accounts connected.'
    if (enabledCount === accounts.length) return `${enabledCount} account${enabledCount === 1 ? '' : 's'} enabled.`
    return `${enabledCount} of ${accounts.length} enabled.`
  }, [accounts])

  const handleSettingsClick = useCallback(() => {
    setOpen(true)
  }, [])

  const openDisconnectDialogForAccount = useCallback((account: ApiAccount) => {
    setDisconnectDialog({ open: true, account })
  }, [])

  const handleDisconnectDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) return
    setDisconnectDialog({ open: false, account: null })
  }, [])

  const handleCancelDisconnect = useCallback(() => {
    setDisconnectDialog({ open: false, account: null })
  }, [])

  const handleRetryClick = useCallback(() => {
    void refetch(connected ? 'refresh' : 'initial')
  }, [connected, refetch])

  const maybeAutoRefresh = useCallback(() => {
    if (loading) return
    if (refreshing) return
    if (error) return
    if (!connected) return
    if (!anyEnabled) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    void refetch('refresh')
  }, [anyEnabled, connected, error, loading, refetch, refreshing])

  useEffect(() => {
    // Keep sidebar calendar reasonably fresh without expensive realtime plumbing.
    // - Refresh periodically while visible
    // - Refresh when returning to the tab/window
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      maybeAutoRefresh()
    }
    const handleWindowFocus = () => {
      maybeAutoRefresh()
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    // Jittered refresh to avoid synchronized spikes across users:
    // schedule the next refresh between 4–6 minutes.
    let timeoutId: number | null = null
    let cancelled = false
    const scheduleNext = () => {
      if (cancelled) return
      const minMs = 4 * 60 * 1000
      const maxMs = 6 * 60 * 1000
      const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1))
      timeoutId = window.setTimeout(() => {
        maybeAutoRefresh()
        scheduleNext()
      }, delay)
    }
    scheduleNext()

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelled = true
      if (timeoutId != null) window.clearTimeout(timeoutId)
    }
  }, [maybeAutoRefresh])

  return (
    <Card className="min-w-0 max-w-full overflow-hidden flex h-[375px] flex-col gap-0 pt-2 pb-0 bg-transparent border-border/40 shadow-none">
      <CardHeader className="gap-1 pb-0 pt-2 px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CardTitle className="text-sm truncate">Calendar</CardTitle>
            {/* Keep a fixed-size slot so the title doesn't reflow when refreshing starts/stops. */}
            <span
              className={cn(
                'inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-opacity',
                refreshing ? 'opacity-100' : 'opacity-0'
              )}
              aria-live="polite"
            >
              {refreshing ? <Spinner aria-hidden="true" className="size-3.5" /> : null}
            </span>
          </div>

          {/* Always render settings so it never disappears on reload; disable until connected. */}
          <div className="shrink-0 size-8">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Calendar settings"
              onClick={handleSettingsClick}
              disabled={!connected}
            >
              <Settings2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="mt-2 px-4 sm:px-6">
        <Separator />
      </div>

      <CardContent
        className={cn(
          // Match TaskList: everything under the separator is scrollable; no bottom padding so content isn't clipped.
          'grid gap-3 min-w-0 px-4 sm:px-6 pt-2 flex-1 min-h-0 overflow-y-scroll overflow-x-hidden pr-4 scrollbar-gutter-stable py-4'
        )}
        aria-busy={loading ? true : undefined}
      >
        {refreshError ? (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {refreshError}
          </p>
        ) : null}
        <div className="grid gap-3 min-w-0">
          {loading ? (
            <CalendarWidgetSkeleton />
          ) : error ? (
            <div className="grid gap-2">
              <p className="text-sm text-destructive" role="status" aria-live="polite">
                {error}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={handleRetryClick}>
                  <RefreshCcw aria-hidden="true" className="mr-2 size-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : !connected ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Not connected.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button asChild type="button" variant="secondary">
                  <Link href={`/api/google-calendar/connect?returnTo=${encodeURIComponent(`/app/w/${workflowId}`)}`}>
                    <span className="inline-flex items-center">
                      <GoogleMark className="mr-2" />
                      {connectGoogleLabel}
                    </span>
                  </Link>
                </Button>
                <Button asChild type="button" variant="secondary">
                  <Link href={`/api/microsoft-calendar/connect?returnTo=${encodeURIComponent(`/app/w/${workflowId}`)}`}>
                    <span className="inline-flex items-center">
                      <MicrosoftMark className="mr-2" />
                      {connectMicrosoftLabel}
                    </span>
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Read-only. You can disconnect anytime.</p>
            </div>
          ) : !anyEnabled ? (
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">No accounts enabled for this workflow.</p>
              <p className="text-xs text-muted-foreground">{settingsSummary}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={handleSettingsClick}>
                  Choose accounts
                </Button>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="grid gap-2">
              {enabledErrors.length > 0 ? (
                <>
                  <p className="text-sm text-destructive" role="status" aria-live="polite">
                    Couldn&apos;t load events for {enabledErrors.length} account{enabledErrors.length === 1 ? '' : 's'}.
                  </p>
                  <p className="text-xs text-muted-foreground">{enabledErrors[0].lastError}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={handleSettingsClick}>
                      Fix connection
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
              )}
            </div>
          ) : (
            <EventsList events={events} />
          )}
        </div>
        <CalendarAccountsDialog
          open={open}
          onOpenChange={setOpen}
          workflowId={workflowId}
          accounts={accounts}
          toggleAction={toggleAction}
          toggleState={toggleState}
          connectGoogleLabel={connectGoogleLabel}
          connectMicrosoftLabel={connectMicrosoftLabel}
          disconnectDialog={disconnectDialog}
          onDisconnectDialogOpenChange={handleDisconnectDialogOpenChange}
          onOpenDisconnectDialogForAccount={openDisconnectDialogForAccount}
          onCancelDisconnect={handleCancelDisconnect}
          disconnectAction={disconnectAction}
          disconnectState={disconnectState}
        />
      </CardContent>
    </Card>
  )
}
