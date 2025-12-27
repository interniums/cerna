'use client'

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Link2, MoreHorizontal, Pin, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import type { Resource } from '@/lib/db/resources'
import { getResourceFaviconSrc } from '@/lib/url'
import {
  confirmDeleteResourceAction,
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
  faviconSrc,
  initialUrl,
  initialTitle,
  initialNotes,
  initialPinned,
  initialEssential,
  returnTo,
  onSaved,
}: {
  resourceId: string
  faviconSrc: string | null
  initialUrl: string
  initialTitle: string | null
  initialNotes: string | null
  initialPinned: boolean
  initialEssential: boolean
  returnTo: string
  onSaved: () => void
}) {
  const [state, formAction] = useActionState(updateResourceAction, initialState)
  const [urlValue, setUrlValue] = useState(initialUrl)
  const [titleValue, setTitleValue] = useState(initialTitle ?? '')
  const [notesValue, setNotesValue] = useState(initialNotes ?? '')
  const [isPinned, setIsPinned] = useState(initialPinned)
  const [isEssential, setIsEssential] = useState(initialEssential)
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)

  const urlId = useId()
  const titleId = useId()
  const notesId = useId()

  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (state.ok) onSaved()
  }, [onSaved, state.ok])

  useEffect(() => {
    // Reset confirm UI when a submit succeeds/fails (prevents stale armed state).
    setIsDeleteConfirming(false)
  }, [state.ok])

  const handlePinnedPressedChange = useCallback(() => {
    setIsPinned((v) => !v)
  }, [])

  const handleEssentialPressedChange = useCallback(() => {
    setIsEssential((v) => !v)
  }, [])

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlValue(e.currentTarget.value)
  }, [])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.currentTarget.value)
  }, [])

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesValue(e.currentTarget.value)
  }, [])

  const handleClearUrlClick = useCallback(() => {
    setUrlValue('')
    queueMicrotask(() => urlInputRef.current?.focus())
  }, [])

  const handleClearTitleClick = useCallback(() => {
    setTitleValue('')
    queueMicrotask(() => titleInputRef.current?.focus())
  }, [])

  const handleClearNotesClick = useCallback(() => {
    setNotesValue('')
    queueMicrotask(() => notesInputRef.current?.focus())
  }, [])

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirming(true)
  }, [])

  const handleDeleteCancelClick = useCallback(() => {
    setIsDeleteConfirming(false)
  }, [])

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="isPinned" value={isPinned ? '1' : ''} />
      <input type="hidden" name="isEssential" value={isEssential ? '1' : ''} />

      <div className="grid gap-2">
        <Label htmlFor={urlId} className="text-muted-foreground">
          URL
        </Label>
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {faviconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconSrc} alt="" className="size-4 rounded-sm" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </div>
          <Input
            id={urlId}
            name="url"
            ref={urlInputRef}
            value={urlValue}
            onChange={handleUrlChange}
            autoComplete="off"
            inputMode="url"
            className="pl-10 pr-10"
            placeholder="https://example.com"
          />
          {urlValue ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="Clear URL"
              onClick={handleClearUrlClick}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={titleId} className="text-muted-foreground">
          Title
        </Label>
        <div className="relative">
          <Input
            id={titleId}
            name="title"
            ref={titleInputRef}
            value={titleValue}
            onChange={handleTitleChange}
            autoComplete="off"
            placeholder="Untitled"
            className="pr-10"
          />
          {titleValue ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="Clear title"
              onClick={handleClearTitleClick}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={notesId} className="text-muted-foreground">
          Notes
        </Label>
        <div className="relative">
          <Textarea
            id={notesId}
            name="notes"
            ref={notesInputRef}
            value={notesValue}
            onChange={handleNotesChange}
            placeholder="Add context…"
            rows={4}
            className="pr-10"
          />
          {notesValue ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-2"
              aria-label="Clear notes"
              onClick={handleClearNotesClick}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Options</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            aria-pressed={isPinned}
            onClick={handlePinnedPressedChange}
            className={[
              'inline-flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:w-auto sm:min-w-[170px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isPinned ? 'border-primary/30 bg-primary/10' : 'border-border/60 bg-muted/30 hover:bg-muted/50',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2">
              <Pin aria-hidden="true" className={isPinned ? 'size-4 text-primary' : 'size-4 text-muted-foreground'} />
              <span>Pin to top</span>
            </span>
            <span className={isPinned ? 'text-xs font-medium text-primary' : 'text-xs text-muted-foreground'}>
              {isPinned ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            aria-pressed={isEssential}
            onClick={handleEssentialPressedChange}
            className={[
              'inline-flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:w-auto sm:min-w-[190px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isEssential ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-border/60 bg-muted/30 hover:bg-muted/50',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2">
              <Star aria-hidden="true" className={isEssential ? 'size-4 text-yellow-500' : 'size-4 text-muted-foreground'} />
              <span>Add to essentials</span>
            </span>
            <span className={isEssential ? 'text-xs font-medium text-yellow-600 dark:text-yellow-400' : 'text-xs text-muted-foreground'}>
              {isEssential ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </div>

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isDeleteConfirming ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <FormSubmitButton
                variant="destructive"
                size="sm"
                idleText="Delete"
                pendingText="Deleting…"
                idleIcon={<Trash2 aria-hidden="true" className="mr-1 size-4" />}
                aria-label="Confirm delete resource"
                formAction={confirmDeleteResourceAction.bind(null, resourceId, returnTo)}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleDeleteCancelClick}>
                Keep
              </Button>
              <p className="text-xs text-muted-foreground sm:ml-2">Undo is available for 10 seconds.</p>
            </div>
          ) : (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={handleDeleteClick}
            >
              Delete resource
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <FormSubmitButton className="w-full sm:w-auto" idleText="Save changes" pendingText="Saving…" />
        </div>
      </div>
    </form>
  )
}

export function ResourceActionsDialog({ resource }: { resource: Resource }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const faviconSrc = useMemo(() => getResourceFaviconSrc(resource), [resource])

  const [open, setOpen] = useState(false)

  const returnTo = useMemo(() => buildReturnTo(pathname, new URLSearchParams(searchParams)), [pathname, searchParams])
  const triggerLabel = useMemo(() => `Open actions for ${getPrimaryText(resource)}`, [resource])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleSaved = useCallback(() => {
    toast('Saved.')
    handleOpenChange(false)
    router.refresh()
  }, [handleOpenChange, router])

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

      <DialogContent className="max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
          <DialogDescription className="sr-only">Edit fields and options for this resource.</DialogDescription>
        </DialogHeader>

        <EditForm
          resourceId={resource.id}
          faviconSrc={faviconSrc}
          initialUrl={resource.url}
          initialTitle={resource.title}
          initialNotes={resource.notes}
          initialPinned={resource.is_pinned}
          initialEssential={resource.is_essential}
          returnTo={returnTo}
          onSaved={handleSaved}
        />
      </DialogContent>
    </Dialog>
  )
}
