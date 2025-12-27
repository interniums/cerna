'use client'

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

import { createTaskAction, type TaskActionState } from '@/features/tasks/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { DatePicker } from '@/components/forms/date-picker'
import { PrimaryAppField, type PrimaryAppValue } from '@/features/tasks/components/primary-app-field'
import { validateHttpUrlInput } from '@/lib/url'

const initialState: TaskActionState = { ok: false, message: '' }

type SpotlightResource = {
  id: string
  url: string
  title: string | null
  favicon_url?: string | null
}

type PrefetchStatus = 'idle' | 'loading' | 'ready' | 'error'

function isPastYmd(ymd: string) {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false
  const chosen = new Date(y, mo, d)
  if (chosen.getFullYear() !== y || chosen.getMonth() !== mo || chosen.getDate() !== d) return false
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return chosen.getTime() < startToday.getTime()
}

function TaskCreateDialogBody({ workflowId, onDone }: { workflowId: string; onDone: () => void }) {
  const router = useRouter()
  const [state, formAction] = useActionState(createTaskAction, initialState)
  const [title, setTitle] = useState('')
  const [dueYmd, setDueYmd] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [primaryApp, setPrimaryApp] = useState<PrimaryAppValue>({ primaryResourceId: '', primaryUrl: '' })
  const [description, setDescription] = useState('')
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>('idle')
  const [prefetchedResources, setPrefetchedResources] = useState<SpotlightResource[]>([])

  const titleId = useId()
  const dueId = useId()
  const urlId = useId()
  const priorityId = useId()
  const appId = useId()
  const descId = useId()
  const urlHelpId = useId()
  const urlErrorId = useId()

  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [urlTouched, setUrlTouched] = useState(false)
  const [urlError, setUrlError] = useState('')

  const dueIsPast = useMemo(() => (dueYmd ? isPastYmd(dueYmd) : false), [dueYmd])

  useEffect(() => {
    // Prefetch recent resources as soon as the dialog opens to avoid the Primary app picker "loading jump".
    const controller = new AbortController()
    queueMicrotask(() => setPrefetchStatus('loading'))

    void fetch('/api/resources/spotlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ workflowId, q: '', limit: 10 }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('bad_response')
        const json = (await res.json()) as { ok?: boolean; items?: SpotlightResource[] }
        setPrefetchedResources(Array.isArray(json.items) ? json.items : [])
        setPrefetchStatus('ready')
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setPrefetchedResources([])
        setPrefetchStatus('error')
      })

    return () => controller.abort()
  }, [workflowId])

  useEffect(() => {
    if (!state.ok) return
    toast('Task added.')
    router.refresh()
    onDone()
  }, [onDone, router, state.ok])

  const validateOptionalUrl = useCallback((raw: string) => {
    const res = validateHttpUrlInput(raw, 'optional')
    return res.ok ? '' : res.message
  }, [])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.currentTarget.value)
  }, [])

  const handleUrlBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setUrlTouched(true)
      setUrlError(validateOptionalUrl(e.currentTarget.value))
    },
    [validateOptionalUrl]
  )

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.currentTarget.value
      setUrlValue(next)
      if (!urlTouched) return
      setUrlError(validateOptionalUrl(next))
    },
    [urlTouched, validateOptionalUrl]
  )

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.currentTarget.value)
  }, [])

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const nextError = validateOptionalUrl(urlValue)
      if (!nextError) return

      e.preventDefault()
      setUrlTouched(true)
      setUrlError(nextError)
      queueMicrotask(() => urlInputRef.current?.focus())
    },
    [urlValue, validateOptionalUrl]
  )

  const handleCancelClick = useCallback(() => {
    onDone()
  }, [onDone])

  const handlePriorityChange = useCallback((next: string) => {
    if (next === 'low' || next === 'medium' || next === 'high') setPriority(next)
  }, [])

  const handlePrimaryAppChange = useCallback((next: PrimaryAppValue) => {
    setPrimaryApp(next)
  }, [])

  const submitTitleInvalid = !state.ok && state.message === 'Enter a task title.'
  const submitUrlInvalid = !state.ok && state.message === 'Enter a valid URL.'
  const submitErrorMessage = !state.ok && !submitUrlInvalid && !submitTitleInvalid ? state.message : ''
  const effectiveUrlError =
    (urlTouched && urlError) || (submitUrlInvalid ? 'Please enter a valid URL (include https://).' : '')
  const showUrlError = Boolean(effectiveUrlError)
  const showTitleError = submitTitleInvalid && !title.trim()

  useEffect(() => {
    if (!showTitleError) return
    queueMicrotask(() => titleInputRef.current?.focus())
  }, [showTitleError])

  return (
    <form action={formAction} className="grid gap-4" onSubmit={handleFormSubmit}>
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="priority" value={priority} />

      <div className="grid gap-2">
        <Label htmlFor={titleId} className="text-muted-foreground">
          Title
        </Label>
        <Input
          ref={titleInputRef}
          id={titleId}
          name="title"
          placeholder="Add a task…"
          autoComplete="off"
          inputMode="text"
          enterKeyHint="done"
          value={title}
          onChange={handleTitleChange}
          aria-invalid={showTitleError}
          aria-describedby={showTitleError ? `${titleId}-error` : undefined}
        />
        <p
          id={`${titleId}-error`}
          className="text-xs text-destructive min-h-4"
          role={showTitleError ? 'status' : undefined}
          aria-live={showTitleError ? 'polite' : undefined}
          aria-hidden={!showTitleError}
        >
          {showTitleError ? 'Enter a title.' : '\u00A0'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={priorityId} className="text-muted-foreground">
            Priority
          </Label>
          <Select value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger id={priorityId} aria-label="Priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          {/* Reserve space for helper text so this row stays aligned with the Due date column. */}
          <p className="min-h-4 text-xs text-muted-foreground" aria-hidden="true">
            {'\u00A0'}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={dueId} className="text-muted-foreground">
            Due date (optional)
          </Label>
          <DatePicker
            id={dueId}
            name="dueDate"
            value={dueYmd}
            placeholder="Pick a due date"
            onValueChange={setDueYmd}
            textClassName={dueIsPast ? 'text-amber-600 dark:text-amber-400' : undefined}
            rightAdornment={
              dueIsPast ? (
                <span className="inline-flex items-center text-amber-600 dark:text-amber-400" aria-hidden="true">
                  <span className="text-sm leading-none">⚠</span>
                </span>
              ) : null
            }
          />
          <p
            className="min-h-4 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
            role={dueIsPast ? 'status' : undefined}
            aria-live={dueIsPast ? 'polite' : undefined}
            aria-hidden={!dueIsPast}
          >
            {dueIsPast ? (
              <>
                <span aria-hidden="true">⚠</span>
                Past due.
              </>
            ) : (
              '\u00A0'
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={urlId} className="text-muted-foreground">
            Task link (optional)
          </Label>
          <Input
            ref={urlInputRef}
            id={urlId}
            name="url"
            placeholder="https://…"
            autoComplete="off"
            inputMode="url"
            value={urlValue}
            aria-invalid={showUrlError}
            aria-describedby={`${urlHelpId} ${urlErrorId}`}
            onBlur={handleUrlBlur}
            onChange={handleUrlChange}
          />
          <p id={urlHelpId} className="text-xs text-muted-foreground truncate" title="Optional link to open later.">
            Optional link to open later.
          </p>
          <p
            id={urlErrorId}
            className="text-xs text-destructive min-h-4"
            role={showUrlError ? 'status' : undefined}
            aria-live={showUrlError ? 'polite' : undefined}
            aria-hidden={!showUrlError}
          >
            {showUrlError ? effectiveUrlError : '\u00A0'}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={appId} className="text-muted-foreground">
            Primary app (optional)
          </Label>
          <div id={appId}>
            <PrimaryAppField
              workflowId={workflowId}
              resourceIdName="primaryResourceId"
              urlName="primaryUrl"
              value={primaryApp}
              onChange={handlePrimaryAppChange}
              prefetchedItems={prefetchedResources}
              prefetchedStatus={prefetchStatus}
            />
          </div>
          {/* Reserve space to match the Task link helper + error rows (keeps columns aligned). */}
          <p className="min-h-4 text-xs text-muted-foreground" aria-hidden="true">
            {'\u00A0'}
          </p>
          <p className="min-h-4 text-xs text-muted-foreground" aria-hidden="true">
            {'\u00A0'}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={descId} className="text-muted-foreground">
          Description (optional)
        </Label>
        <Textarea id={descId} name="description" placeholder="Add details…" value={description} onChange={handleDescriptionChange} />
      </div>

      {submitErrorMessage ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {submitErrorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={handleCancelClick}>
          Cancel
        </Button>
        <FormSubmitButton idleText="Add task" pendingText="Adding…" />
      </div>
    </form>
  )
}

export function TaskCreateDialog({ workflowId }: { workflowId: string }) {
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setResetKey((k) => k + 1)
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleDone = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-label="Add task"
        title="Add task"
        onClick={handleTriggerClick}
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>

          <TaskCreateDialogBody key={resetKey} workflowId={workflowId} onDone={handleDone} />
        </DialogContent>
      </Dialog>
    </>
  )
}


