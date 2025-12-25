'use client'

import { useActionState, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { Resource } from '@/lib/db/resources'
import {
  confirmDeleteResourceAction,
  toggleEssentialStateAction,
  togglePinnedStateAction,
  updateResourceAction,
  type ResourceActionState,
} from '@/features/resources/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Separator } from '@/components/ui/separator'

const initialState: ResourceActionState = { ok: false, message: '' }

function getPrimaryText(resource: Resource) {
  return resource.title?.trim() ? resource.title : resource.url
}

function buildReturnTo(pathname: string, searchParams: URLSearchParams) {
  const sp = new URLSearchParams(searchParams)
  sp.delete('undo')
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

function EditForm({
  resourceId,
  initialTitle,
  initialNotes,
  onSaved,
}: {
  resourceId: string
  initialTitle: string | null
  initialNotes: string | null
  onSaved: () => void
}) {
  const [state, formAction] = useActionState(updateResourceAction, initialState)
  const titleId = useId()
  const notesId = useId()

  useEffect(() => {
    if (state.ok) onSaved()
  }, [onSaved, state.ok])

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="resourceId" value={resourceId} />

      <div className="grid gap-2">
        <Label htmlFor={titleId} className="text-muted-foreground">
          Title
        </Label>
        <Input id={titleId} name="title" defaultValue={initialTitle ?? ''} autoComplete="off" placeholder="Untitled" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={notesId} className="text-muted-foreground">
          Notes
        </Label>
        <Textarea id={notesId} name="notes" defaultValue={initialNotes ?? ''} placeholder="Add context…" rows={4} />
      </div>

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <FormSubmitButton idleText="Save" pendingText="Saving…" />
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Close
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}

function PinForm({ resourceId, isPinned, onToggled }: { resourceId: string; isPinned: boolean; onToggled: () => void }) {
  const [state, formAction] = useActionState(togglePinnedStateAction, initialState)

  useEffect(() => {
    if (state.ok) onToggled()
  }, [onToggled, state.ok])

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="resourceId" value={resourceId} />

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <FormSubmitButton
        variant="secondary"
        className="h-10 justify-start"
        idleText={isPinned ? 'Unpin' : 'Pin'}
        pendingText={isPinned ? 'Unpinning…' : 'Pinning…'}
      />
    </form>
  )
}

function EssentialsForm({
  resourceId,
  isEssential,
  onToggled,
}: {
  resourceId: string
  isEssential: boolean
  onToggled: () => void
}) {
  const [state, formAction] = useActionState(toggleEssentialStateAction, initialState)

  useEffect(() => {
    if (state.ok) onToggled()
  }, [onToggled, state.ok])

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="resourceId" value={resourceId} />

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <FormSubmitButton
        variant="secondary"
        className="h-10 justify-start"
        idleText={isEssential ? 'Remove from essentials' : 'Add to essentials'}
        pendingText={isEssential ? 'Removing…' : 'Adding…'}
      />
    </form>
  )
}

export function ResourceActionsDialog({ resource }: { resource: Resource }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const returnTo = useMemo(() => buildReturnTo(pathname, new URLSearchParams(searchParams)), [pathname, searchParams])
  const triggerLabel = useMemo(() => `Open actions for ${getPrimaryText(resource)}`, [resource])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setConfirmDelete(false)
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleSaved = useCallback(() => {
    toast.success('Saved.')
    handleOpenChange(false)
    router.refresh()
  }, [handleOpenChange, router])

  const handlePinnedToggled = useCallback(() => {
    toast.success(resource.is_pinned ? 'Unpinned.' : 'Pinned.')
    handleOpenChange(false)
    router.refresh()
  }, [handleOpenChange, resource.is_pinned, router])

  const handleEssentialsToggled = useCallback(() => {
    toast.success(resource.is_essential ? 'Removed from essentials.' : 'Added to essentials.')
    handleOpenChange(false)
    router.refresh()
  }, [handleOpenChange, resource.is_essential, router])

  const handleStartDelete = useCallback(() => setConfirmDelete(true), [])
  const handleCancelDelete = useCallback(() => setConfirmDelete(false), [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="cerna-hover-control"
        aria-label={triggerLabel}
        onClick={handleTriggerClick}
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resource</DialogTitle>
          <DialogDescription className="sr-only">Edit, pin, add to essentials, or delete this resource.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border/60 p-3">
          <p className="truncate text-sm font-medium">{getPrimaryText(resource)}</p>
          <p className="truncate text-xs text-muted-foreground">{resource.url}</p>
        </div>

        <EditForm
          resourceId={resource.id}
          initialTitle={resource.title}
          initialNotes={resource.notes}
          onSaved={handleSaved}
        />

        <Separator className="my-2" />

        <div className="grid gap-2">
          <p className="text-sm font-medium">Pin</p>
          <PinForm resourceId={resource.id} isPinned={resource.is_pinned} onToggled={handlePinnedToggled} />
        </div>

        <Separator className="my-2" />

        <div className="grid gap-2">
          <p className="text-sm font-medium">Essentials</p>
          <EssentialsForm
            resourceId={resource.id}
            isEssential={resource.is_essential}
            onToggled={handleEssentialsToggled}
          />
        </div>

        <Separator className="my-2" />

        <div className="grid gap-2">
          <p className="text-sm font-medium">Delete</p>
          <p className="text-sm text-muted-foreground">You can undo right after.</p>

          {confirmDelete ? (
            <>
              <form action={confirmDeleteResourceAction.bind(null, resource.id, returnTo)} className="grid gap-2">
                <FormSubmitButton
                  variant="destructive"
                  className="h-12 font-semibold uppercase tracking-wide"
                  idleText="Delete resource"
                  pendingText="Deleting…"
                />
              </form>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancelDelete}>
                Keep resource
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-12 font-semibold uppercase tracking-wide"
              onClick={handleStartDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
