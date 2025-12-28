'use client'

import Link from 'next/link'
import { MoreHorizontal, Unlink2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { FormSubmitSwitch } from '@/components/forms/form-submit-switch'

import type { CalendarActionState } from '@/features/calendar/actions'
import type { ApiAccount, DisconnectDialogState } from './calendar-widget.types'

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

type CalendarAccountsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  accounts: ApiAccount[]

  toggleAction: (formData: FormData) => void
  toggleState: CalendarActionState

  connectGoogleLabel: string
  connectMicrosoftLabel: string

  disconnectDialog: DisconnectDialogState
  onDisconnectDialogOpenChange: (open: boolean) => void
  onOpenDisconnectDialogForAccount: (account: ApiAccount) => void
  onCancelDisconnect: () => void

  disconnectAction: (formData: FormData) => void
  disconnectState: CalendarActionState
}

export function CalendarAccountsDialog({
  open,
  onOpenChange,
  workflowId,
  accounts,
  toggleAction,
  toggleState,
  connectGoogleLabel,
  connectMicrosoftLabel,
  disconnectDialog,
  onDisconnectDialogOpenChange,
  onOpenDisconnectDialogForAccount,
  onCancelDisconnect,
  disconnectAction,
  disconnectState,
}: CalendarAccountsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

                <div className="flex shrink-0 items-center gap-2">
                  <form action={toggleAction} className="flex items-center gap-2">
                    <input type="hidden" name="workflowId" value={workflowId} />
                    <input type="hidden" name="accountId" value={a.id} />
                    <input type="hidden" name="enabled" value={a.enabled ? 'false' : 'true'} />
                    <span
                      id={`show-in-workflow-${a.id}`}
                      className="sr-only sm:not-sr-only text-xs text-muted-foreground whitespace-nowrap"
                    >
                      Show in workflow
                    </span>
                    <FormSubmitSwitch
                      checked={a.enabled}
                      aria-labelledby={`show-in-workflow-${a.id}`}
                      pendingLabel="Saving…"
                    />
                  </form>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Account actions for ${a.email}`}
                      >
                        <MoreHorizontal aria-hidden="true" className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {a.lastError ? (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/${
                              a.provider === 'microsoft'
                                ? 'api/microsoft-calendar/connect'
                                : 'api/google-calendar/connect'
                            }?returnTo=${encodeURIComponent(`/app/w/${workflowId}`)}`}
                          >
                            Reconnect
                          </Link>
                        </DropdownMenuItem>
                      ) : null}

                      <DropdownMenuItem variant="destructive" onSelect={() => onOpenDisconnectDialogForAccount(a)}>
                        <Unlink2 aria-hidden="true" className="size-4" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

        <Dialog open={disconnectDialog.open} onOpenChange={onDisconnectDialogOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect account?</DialogTitle>
              <DialogDescription>
                This removes access for{' '}
                <span className="font-medium text-foreground">{disconnectDialog.account?.email ?? 'this account'}</span>
                . You can reconnect anytime.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onCancelDisconnect}>
                Cancel
              </Button>

              <form action={disconnectAction}>
                <input type="hidden" name="accountId" value={disconnectDialog.account?.id ?? ''} />
                <FormSubmitButton
                  variant="destructive"
                  disabled={!disconnectDialog.account}
                  idleText="Disconnect"
                  pendingText="Disconnecting…"
                  idleIcon={<Unlink2 aria-hidden="true" className="mr-2 size-4" />}
                />
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
