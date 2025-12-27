'use client'

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2, X } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { updateTaskAction, type TaskActionState } from '@/features/tasks/actions'
import { Button } from '@/components/ui/button'
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

function ymdFromIso(iso: string | null) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  return new Date(t).toISOString().slice(0, 10)
}

export function TaskEditForm({
  task,
  onDone,
  onRequestDelete,
  isDeleting = false,
  deleteErrorMessage = '',
}: {
  task: Task
  onDone: () => void
  onRequestDelete?: () => void
  isDeleting?: boolean
  deleteErrorMessage?: string
}) {
  const router = useRouter()
  const [state, formAction] = useActionState(updateTaskAction, initialState)

  const [title, setTitle] = useState(task.title ?? '')
  const [dueYmd, setDueYmd] = useState(() => ymdFromIso(task.due_at))
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task.priority ?? 'medium')
  const [primaryApp, setPrimaryApp] = useState<PrimaryAppValue>(() => ({
    primaryResourceId: task.primary_resource_id ?? '',
    primaryUrl: task.primary_url ?? '',
  }))
  const [description, setDescription] = useState(task.description ?? '')
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>('idle')
  const [prefetchedResources, setPrefetchedResources] = useState<SpotlightResource[]>([])

  const selectedResourceHint = useMemo<SpotlightResource | null>(() => {
    const r = task.primary_resource ?? null
    if (!r) return null
    return { id: r.id, url: r.url, title: r.title ?? null, favicon_url: r.favicon_url ?? null }
  }, [task.primary_resource])

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
  const [urlValue, setUrlValue] = useState(task.url ?? '')
  const [urlTouched, setUrlTouched] = useState(false)
  const [urlError, setUrlError] = useState('')

  const dueIsPast = useMemo(() => (dueYmd ? isPastYmd(dueYmd) : false), [dueYmd])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => setPrefetchStatus('loading'))

    void fetch('/api/resources/spotlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ workflowId: task.workflow_id, q: '', limit: 10 }),
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
  }, [task.workflow_id])

  useEffect(() => {
    if (!state.ok) return
    toast('Task updated.')
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

  const handleClearTitleClick = useCallback(() => {
    setTitle('')
    queueMicrotask(() => titleInputRef.current?.focus())
  }, [])

  const handleClearUrlClick = useCallback(() => {
    setUrlValue('')
    setUrlTouched(false)
    setUrlError('')
    queueMicrotask(() => urlInputRef.current?.focus())
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

  const handleRequestDeleteClick = useCallback(() => {
    // Parent owns delete behavior (keeps this form focused on edits).
    onRequestDelete?.()
  }, [onRequestDelete])

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
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="priority" value={priority} />

      <div className="grid gap-2">
        <Label htmlFor={titleId} className="text-muted-foreground">
          Title
        </Label>
        <div className="relative">
          <Input
            ref={titleInputRef}
            id={titleId}
            name="title"
            placeholder="Task title…"
            autoComplete="off"
            inputMode="text"
            value={title}
            onChange={handleTitleChange}
            aria-invalid={showTitleError}
            aria-describedby={showTitleError ? `${titleId}-error` : undefined}
            className="pr-10"
          />
          {title ? (
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
                  {/* Using a simple glyph keeps this lightweight and consistent with the calm UI */}
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
          <div className="relative">
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
              className="pr-10"
            />
            {urlValue ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                aria-label="Clear task link"
                onClick={handleClearUrlClick}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
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
              workflowId={task.workflow_id}
              resourceIdName="primaryResourceId"
              urlName="primaryUrl"
              value={primaryApp}
              onChange={handlePrimaryAppChange}
              prefetchedItems={prefetchedResources}
              prefetchedStatus={prefetchStatus}
              selectedResource={selectedResourceHint}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:mr-auto">
          {onRequestDelete ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={handleRequestDeleteClick}
              disabled={isDeleting}
              aria-disabled={isDeleting}
              aria-label={isDeleting ? 'Deleting task' : 'Delete task'}
            >
              {isDeleting ? (
                <>
                  <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 aria-hidden="true" className="mr-2 size-4" />
                  Delete task
                </>
              )}
            </Button>
          ) : null}
          {!isDeleting && deleteErrorMessage ? (
            <p className="text-sm text-destructive" role="status" aria-live="polite">
              {deleteErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleCancelClick}>
            Cancel
          </Button>
          <FormSubmitButton idleText="Save changes" pendingText="Saving…" />
        </div>
      </div>
    </form>
  )
}


