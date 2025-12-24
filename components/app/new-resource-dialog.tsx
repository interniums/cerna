'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'

import { createResourceAction, type ResourceActionState } from '@/features/resources/actions'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

const initialState: ResourceActionState = { ok: false, message: '' }

type NewResourceDialogProps = {
  defaultCategoryId?: string
}

export function NewResourceDialog({ defaultCategoryId }: NewResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const hiddenInputs = useMemo(() => {
    if (!defaultCategoryId) return null
    return <input type="hidden" name="categoryId" value={defaultCategoryId} />
  }, [defaultCategoryId])

  function handleDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setResetKey((k) => k + 1)
  }

  function closeAndResetDialog() {
    setOpen(false)
    setResetKey((k) => k + 1)
  }

  function handleCreated() {
    toast.success('Resource added.')
    // Important: when we close programmatically, Radix won't call `onOpenChange`,
    // so we must also reset internal dialog state ourselves.
    closeAndResetDialog()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Add resource</Button>
      </DialogTrigger>
      <NewResourceDialogBody key={resetKey} hiddenInputs={hiddenInputs} onCreated={handleCreated} />
    </Dialog>
  )
}

function NewResourceDialogBody({ hiddenInputs, onCreated }: { hiddenInputs: React.ReactNode; onCreated: () => void }) {
  const [state, formAction] = useActionState(createResourceAction, initialState)
  const [urlInput, setUrlInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const debouncedUrl = useDebouncedValue(urlInput.trim(), 350)
  const [preview, setPreview] = useState<{
    title?: string
    description?: string
    faviconUrl?: string
    imageUrl?: string
  } | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const inFlight = useRef<AbortController | null>(null)
  const titleEditedRef = useRef(false)
  const didCompleteRef = useRef(false)
  const errorMessage = state.ok ? '' : state.message

  function handleUrlChange(next: string) {
    setUrlInput(next)
  }

  function handleTitleChange(next: string) {
    titleEditedRef.current = true
    setTitleInput(next)
  }

  function handleUrlInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleUrlChange(e.target.value)
  }

  function handleTitleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleTitleChange(e.target.value)
  }

  async function fetchPreview(url: string) {
    // Cancel any previous request to prevent race conditions.
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    setPreviewState('loading')
    setPreview(null)

    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ url }),
      })

      if (!res.ok) {
        setPreviewState('error')
        return
      }

      const json = (await res.json()) as { ok: boolean; meta?: typeof preview }
      setPreview(json.meta ?? null)
      setPreviewState('ready')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setPreviewState('error')
    }
  }

  useEffect(() => {
    // Reset preview if URL is empty or clearly invalid.
    if (!debouncedUrl) {
      setPreview(null)
      setPreviewState('idle')
      return
    }
    // Avoid doing work for obviously non-URLs (cheap gate; server re-validates anyway).
    if (!debouncedUrl.startsWith('http://') && !debouncedUrl.startsWith('https://')) {
      setPreview(null)
      setPreviewState('idle')
      return
    }

    void fetchPreview(debouncedUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUrl])

  useEffect(() => {
    // Auto-fill title from preview only if the user hasn't typed a title.
    if (titleEditedRef.current) return
    if (titleInput.trim()) return
    if (previewState !== 'ready') return
    const candidate = preview?.title?.trim()
    if (!candidate) return
    setTitleInput(candidate)
  }, [previewState, preview?.title, titleInput])

  useEffect(() => {
    if (didCompleteRef.current) return
    if (!state.ok) return
    didCompleteRef.current = true
    onCreated()
  }, [onCreated, state.ok])

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add resource</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="grid gap-4">
        {hiddenInputs}
        <div className="grid gap-2">
          <Label htmlFor="resource-url">URL</Label>
          <Input
            id="resource-url"
            name="url"
            placeholder="https://…"
            inputMode="url"
            autoComplete="off"
            required
            value={urlInput}
            onChange={handleUrlInputChange}
          />
        </div>

        <UrlPreview state={previewState} url={debouncedUrl} preview={preview} />

        <div className="grid gap-2">
          <Label htmlFor="resource-title">Title (optional)</Label>
          <Input
            id="resource-title"
            name="title"
            placeholder="Onboarding doc"
            autoComplete="off"
            value={titleInput}
            onChange={handleTitleInputChange}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="resource-notes">Notes (optional)</Label>
          <Textarea id="resource-notes" name="notes" placeholder="Why this matters…" rows={4} />
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <FormSubmitButton idleText="Add resource" pendingText="Adding…" />
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </div>
      </form>
    </DialogContent>
  )
}

function UrlPreview({
  state,
  url,
  preview,
}: {
  state: 'idle' | 'loading' | 'ready' | 'error'
  url: string
  preview: { title?: string; description?: string; faviconUrl?: string; imageUrl?: string } | null
}) {
  if (!url || state === 'idle') return null

  return (
    <Card className="w-full min-w-0 overflow-hidden p-4">
      {state === 'loading' ? (
        <div className="grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ) : state === 'error' ? (
        <p className="text-sm text-muted-foreground">Couldn’t load a preview. You can still save.</p>
      ) : (
        <div className="flex min-w-0 gap-3">
          {preview?.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.faviconUrl}
              alt=""
              className="mt-0.5 size-5 shrink-0 rounded-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
              <Link2 aria-hidden="true" className="size-3.5" />
            </div>
          )}
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-medium">{preview?.title?.trim() ? preview.title : 'Preview'}</p>
            {preview?.description ? (
              <p className="mt-1 line-clamp-2 wrap-break-word text-sm text-muted-foreground">{preview.description}</p>
            ) : (
              <p className="mt-1 line-clamp-2 break-all text-sm text-muted-foreground">{url}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
