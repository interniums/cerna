'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import type { ResourceActionState } from '@/features/resources/actions'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { getFaviconProxyUrl, getFaviconProxyUrlFromIconUrl, validateHttpUrlInput } from '@/lib/url'
import { cn } from '@/lib/utils'

const initialState: ResourceActionState = { ok: false, message: '' }

type PreviewMeta = {
  title?: string
  description?: string
  faviconUrl?: string
  imageUrl?: string
}

function UrlPreview({
  state,
  url,
  preview,
}: {
  state: 'idle' | 'loading' | 'ready' | 'error'
  url: string
  preview: PreviewMeta | null
}) {
  if (!url || state === 'idle') return null

  return (
    <Card className="w-full min-w-0 overflow-hidden p-4">
      {state === 'loading' ? (
        <div className="flex min-w-0 gap-3">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-sm" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ) : state === 'error' ? (
        <p className="text-sm text-muted-foreground">Couldn’t load a preview. You can still save.</p>
      ) : (
        <div className="flex min-w-0 gap-3">
          {(() => {
            const iconSrc = preview?.faviconUrl?.trim()
              ? getFaviconProxyUrlFromIconUrl(preview.faviconUrl)
              : url
              ? getFaviconProxyUrl(url)
              : null

            return iconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconSrc} alt="" className="mt-0.5 size-5 shrink-0 rounded-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                <Link2 aria-hidden="true" className="size-3.5" />
              </div>
            )
          })()}
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

export function ResourceCreateForm({
  action,
  title,
  descriptionSrOnly,
  submitIdleText,
  submitPendingText,
  successToast,
  onDone,
  hiddenInputs,
  extraFields,
  urlInputId = 'resource-url',
  titleInputId = 'resource-title',
  notesInputId = 'resource-notes',
  urlPlaceholder = 'https://…',
  titlePlaceholder = 'Onboarding doc',
  notesPlaceholder = 'Why this matters…',
}: {
  action: (prev: ResourceActionState, formData: FormData) => Promise<ResourceActionState>
  title: string
  descriptionSrOnly: string
  submitIdleText: string
  submitPendingText: string
  successToast: string
  onDone: () => void
  hiddenInputs?: React.ReactNode
  extraFields?: React.ReactNode
  urlInputId?: string
  titleInputId?: string
  notesInputId?: string
  urlPlaceholder?: string
  titlePlaceholder?: string
  notesPlaceholder?: string
}) {
  const router = useRouter()
  const [state, formAction] = useActionState(action, initialState)

  const [urlInput, setUrlInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const debouncedUrl = useDebouncedValue(urlInput.trim(), 350)

  const [preview, setPreview] = useState<PreviewMeta | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const inFlight = useRef<AbortController | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)

  const [titleEdited, setTitleEdited] = useState(false)
  const titleEditedRef = useRef(false)
  const didCompleteRef = useRef(false)

  const submitUrlInvalid = !state.ok && state.message === 'Enter a valid URL.'
  const errorMessage = state.ok ? '' : submitUrlInvalid ? '' : state.message

  const [urlTouched, setUrlTouched] = useState(false)
  const [urlError, setUrlError] = useState('')
  const urlHelpId = `${urlInputId}-help`

  const showTitleAutofillSpinner =
    previewState === 'loading' && urlTouched && !urlError && !titleEdited && !titleInput.trim()

  const submitUrlInvalidMessage = 'Please enter a valid URL (include https://).'

  function handleUrlChange(next: string) {
    setUrlInput(next)
    if (urlTouched) {
      const res = validateHttpUrlInput(next, 'required')
      setUrlError(res.ok ? '' : res.message)
    }
  }

  function handleTitleChange(next: string) {
    titleEditedRef.current = true
    setTitleEdited(true)
    setTitleInput(next)
  }

  function handleUrlInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleUrlChange(e.target.value)
  }

  function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    setUrlTouched(true)
    const res = validateHttpUrlInput(e.target.value, 'required')
    setUrlError(res.ok ? '' : res.message)
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    const res = validateHttpUrlInput(urlInput, 'required')
    if (res.ok) return
    e.preventDefault()
    setUrlTouched(true)
    setUrlError(res.message)
    queueMicrotask(() => urlInputRef.current?.focus())
  }

  function handleTitleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleTitleChange(e.target.value)
  }

  async function fetchPreview(url: string) {
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

      const json = (await res.json()) as { ok: boolean; meta?: PreviewMeta }
      setPreview(json.meta ?? null)
      setPreviewState('ready')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setPreviewState('error')
    }
  }

  useEffect(() => {
    if (!debouncedUrl) {
      queueMicrotask(() => {
        setPreview(null)
        setPreviewState('idle')
      })
      return
    }
    if (!debouncedUrl.startsWith('http://') && !debouncedUrl.startsWith('https://')) {
      queueMicrotask(() => {
        setPreview(null)
        setPreviewState('idle')
      })
      return
    }

    // Avoid sync setState in effect body (can cause cascading renders per lint rule).
    queueMicrotask(() => {
      void fetchPreview(debouncedUrl)
    })
  }, [debouncedUrl])

  useEffect(() => {
    if (titleEditedRef.current) return
    if (titleInput.trim()) return
    if (previewState !== 'ready') return
    const candidate = preview?.title?.trim()
    if (!candidate) return
    queueMicrotask(() => setTitleInput(candidate))
  }, [previewState, preview?.title, titleInput])

  useEffect(() => {
    if (didCompleteRef.current) return
    if (!state.ok) return
    didCompleteRef.current = true
    toast(successToast)
    router.refresh()
    onDone()
  }, [onDone, router, state.ok, successToast])

  return (
    <form action={formAction} className="flex h-full min-h-0 flex-col gap-4" onSubmit={handleFormSubmit}>
      <div className="sr-only">
        <p>{title}</p>
        <p>{descriptionSrOnly}</p>
      </div>

      {hiddenInputs}

      <div className="grid gap-2">
        <Label htmlFor={urlInputId} className="text-muted-foreground">
          URL
        </Label>
        <Input
          ref={urlInputRef}
          id={urlInputId}
          name="url"
          placeholder={urlPlaceholder}
          inputMode="url"
          autoComplete="off"
          required
          value={urlInput}
          onChange={handleUrlInputChange}
          onBlur={handleUrlBlur}
          aria-describedby={urlHelpId}
          aria-invalid={(urlTouched && Boolean(urlError)) || submitUrlInvalid}
        />
        <p
          id={urlHelpId}
          className={cn(
            'min-h-4 text-xs',
            (urlTouched && urlError) || submitUrlInvalid ? 'text-destructive' : 'text-muted-foreground'
          )}
          role={urlTouched && urlError ? 'status' : submitUrlInvalid ? 'status' : undefined}
          aria-live={urlTouched && urlError ? 'polite' : submitUrlInvalid ? 'polite' : undefined}
        >
          {urlTouched && urlError ? urlError : submitUrlInvalid ? submitUrlInvalidMessage : 'Paste a link.'}
        </p>
      </div>

      <UrlPreview state={previewState} url={debouncedUrl} preview={preview} />

      <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto pr-0.5">
        {extraFields}

        <div className="grid gap-2">
          <Label htmlFor={titleInputId} className="text-muted-foreground">
            Title (optional)
          </Label>
          <div className="relative">
            <Input
              id={titleInputId}
              name="title"
              placeholder={titlePlaceholder}
              autoComplete="off"
              value={titleInput}
              onChange={handleTitleInputChange}
              className={showTitleAutofillSpinner ? 'pr-9' : undefined}
            />
            {showTitleAutofillSpinner ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={notesInputId} className="text-muted-foreground">
            Notes (optional)
          </Label>
          <Textarea id={notesInputId} name="notes" placeholder={notesPlaceholder} rows={4} />
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end">
        <FormSubmitButton idleText={submitIdleText} pendingText={submitPendingText} />
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}
