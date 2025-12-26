'use client'

import Link from 'next/link'
import { useActionState, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Link2, RefreshCcw, Settings2, Unlink2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { disconnectCalendarAccountAction, toggleWorkflowCalendarVisibilityAction, type CalendarActionState } from '@/features/calendar/actions'

type ApiEvent = {
  id: string
  title: string
  start: string
  end: string | null
  isAllDay: boolean
  joinUrl: string | null
  openUrl: string | null
  accountId: string
  accountEmail: string
  provider: 'google' | 'microsoft'
}

type ApiAccount = {
  id: string
  provider: 'google' | 'microsoft'
  email: string
  displayName: string | null
  enabled: boolean
  lastError: string | null
}

type EventsResponse =
  | { ok: true; accounts: ApiAccount[]; events: ApiEvent[] }
  | { ok: false; message: string }

const initialState: CalendarActionState = { ok: false, message: '' }

function formatEventTime(startIso: string, isAllDay: boolean) {
  const t = Date.parse(startIso)
  if (!Number.isFinite(t)) return ''
  const d = new Date(t)
  if (isAllDay) return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function CalendarWidget({ workflowId }: { workflowId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [events, setEvents] = useState<ApiEvent[]>([])

  const [toggleState, toggleAction] = useActionState(toggleWorkflowCalendarVisibilityAction, initialState)
  const [disconnectState, disconnectAction] = useActionState(disconnectCalendarAccountAction, initialState)

  const connected = accounts.length > 0
  const anyEnabled = accounts.some((a) => a.enabled)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar/events?workflowId=${encodeURIComponent(workflowId)}`, { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as EventsResponse | null
      if (!json || !json.ok) {
        setError(json && !json.ok ? json.message : 'Couldn’t load calendar.')
        setAccounts([])
        setEvents([])
      } else {
        setAccounts(json.accounts)
        setEvents(json.events)
      }
    } catch {
      setError('Couldn’t load calendar.')
      setAccounts([])
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    if (!toggleState.ok) return
    void refetch()
  }, [refetch, toggleState.ok])

  useEffect(() => {
    if (!disconnectState.ok) return
    toast.success('Disconnected.')
    void refetch()
  }, [disconnectState.ok, refetch])

  const settingsSummary = useMemo(() => {
    const enabledCount = accounts.filter((a) => a.enabled).length
    if (accounts.length === 0) return 'No accounts connected.'
    if (enabledCount === accounts.length) return `Showing ${enabledCount} account${enabledCount === 1 ? '' : 's'}.`
    return `Showing ${enabledCount} of ${accounts.length} accounts.`
  }, [accounts])

  const handleSettingsClick = useCallback(() => {
    setOpen(true)
  }, [])

  const handleRetryClick = useCallback(() => {
    void refetch()
  }, [refetch])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Calendar</CardTitle>
          {connected ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Calendar settings" onClick={handleSettingsClick}>
              <Settings2 aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        {loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
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
                  Connect Google
                </Link>
              </Button>
              <Button asChild type="button" variant="secondary">
                <Link href={`/api/microsoft-calendar/connect?returnTo=${encodeURIComponent(`/app/w/${workflowId}`)}`}>
                  Connect Microsoft
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
            <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
            <p className="text-xs text-muted-foreground">{settingsSummary}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {events.map((e) => (
              <div key={`${e.accountId}:${e.id}`} className="rounded-lg border border-border/60 bg-card px-3 py-2 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatEventTime(e.start, e.isAllDay)} · {e.accountEmail} · {e.provider === 'microsoft' ? 'Microsoft' : 'Google'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {e.joinUrl ? (
                      <Button asChild type="button" variant="secondary" size="sm">
                        <Link href={e.joinUrl} target="_blank" rel="noopener noreferrer">
                          <Link2 aria-hidden="true" className="mr-2 size-4" />
                          Join
                        </Link>
                      </Button>
                    ) : null}
                    {e.openUrl ? (
                      <Button asChild type="button" variant="ghost" size="sm">
                        <Link href={e.openUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink aria-hidden="true" className="mr-2 size-4" />
                          Open
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{settingsSummary}</p>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calendar accounts</DialogTitle>
              <DialogDescription>Choose which accounts appear in this workflow.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              {accounts.map((a) => (
                <div key={a.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.displayName ?? a.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.email} · {a.provider === 'microsoft' ? 'Microsoft' : 'Google'}
                      </p>
                      {a.lastError ? <p className="mt-1 text-xs text-destructive">{a.lastError}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {a.lastError ? (
                        <Button asChild type="button" variant="secondary" className="h-9 w-full justify-start">
                          <Link
                            href={`/${a.provider === 'microsoft' ? 'api/microsoft-calendar/connect' : 'api/google-calendar/connect'}?returnTo=${encodeURIComponent(
                              `/app/w/${workflowId}`
                            )}`}
                          >
                            Reconnect
                          </Link>
                        </Button>
                      ) : null}

                      <form action={toggleAction}>
                        <input type="hidden" name="workflowId" value={workflowId} />
                        <input type="hidden" name="accountId" value={a.id} />
                        <input type="hidden" name="enabled" value={a.enabled ? 'false' : 'true'} />
                        <FormSubmitButton
                          variant="secondary"
                          className="h-9 w-full justify-start"
                          idleText={a.enabled ? 'Hide in this workflow' : 'Show in this workflow'}
                          pendingText="Saving…"
                        />
                      </form>

                      <form action={disconnectAction}>
                        <input type="hidden" name="accountId" value={a.id} />
                        <FormSubmitButton
                          variant="destructive"
                          className="h-9 w-full justify-start"
                          idleText="Disconnect"
                          pendingText="Disconnecting…"
                          idleIcon={<Unlink2 aria-hidden="true" className="mr-2 size-4" />}
                        />
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!toggleState.ok && toggleState.message ? (
              <p className="text-sm text-destructive" role="status" aria-live="polite">
                {toggleState.message}
              </p>
            ) : null}

            {!disconnectState.ok && disconnectState.message ? (
              <p className="text-sm text-destructive" role="status" aria-live="polite">
                {disconnectState.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button asChild type="button" variant="secondary">
                <Link href={`/api/google-calendar/connect?returnTo=${encodeURIComponent(`/app/w/${workflowId}`)}`}>
                  Connect Google
                </Link>
              </Button>
              <Button asChild type="button" variant="secondary">
                <Link href={`/api/microsoft-calendar/connect?returnTo=${encodeURIComponent(`/app/w/${workflowId}`)}`}>
                  Connect Microsoft
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}


