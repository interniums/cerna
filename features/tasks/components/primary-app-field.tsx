'use client'

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ExternalLink, Globe, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { createResourceAction, type ResourceActionState } from '@/features/resources/actions'
import { getFaviconProxyUrl, getFaviconProxyUrlFromIconUrl, validateHttpUrlInput } from '@/lib/url'

type SpotlightResource = {
  id: string
  url: string
  title: string | null
  favicon_url?: string | null
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

export type PrimaryAppValue = {
  primaryResourceId: string
  primaryUrl: string
}

type PrimaryAppFieldProps = {
  workflowId: string
  resourceIdName: string
  urlName: string
  value: PrimaryAppValue
  onChange: (next: PrimaryAppValue) => void
  prefetchedItems?: SpotlightResource[]
  prefetchedStatus?: Status
  selectedResource?: SpotlightResource | null
}

export function PrimaryAppField({
  workflowId,
  resourceIdName,
  urlName,
  value,
  onChange,
  prefetchedItems,
  prefetchedStatus,
  selectedResource,
}: PrimaryAppFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>(prefetchedStatus ?? 'idle')
  const [items, setItems] = useState<SpotlightResource[]>(prefetchedItems ?? [])
  const [showAddForm, setShowAddForm] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const triggerWrapRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => setOpen(false), [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = null
  }, [])

  const fetchItems = useCallback(
    (q: string) => {
      cancel()
      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')

      void fetch('/api/resources/spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ workflowId, q, limit: q ? 20 : 10 }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('bad_response')
          const json = (await res.json()) as { ok?: boolean; items?: SpotlightResource[] }
          setItems(Array.isArray(json.items) ? json.items : [])
          setStatus('ready')
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setItems([])
          setStatus('error')
        })
    },
    [cancel, workflowId]
  )

  useEffect(() => {
    if (!open) return
    // If we already have prefetched recents and no query, don't refetch on first open (prevents loading jump).
    if (!query.trim() && status === 'ready' && items.length > 0) return
    // Fetch with the current query; typing happens in the trigger input.
    const id = window.setTimeout(() => fetchItems(query.trim()), 0)
    return () => {
      window.clearTimeout(id)
      cancel()
    }
  }, [cancel, fetchItems, items.length, open, query, status])

  const selectedLabel = useMemo(() => {
    if (value.primaryResourceId) {
      const found = items.find((i) => i.id === value.primaryResourceId)
      if (found?.title?.trim()) return found.title
      if (selectedResource?.id === value.primaryResourceId) {
        if (selectedResource.title?.trim()) return selectedResource.title
        if (selectedResource.url?.trim()) return selectedResource.url
      }
    }
    return value.primaryUrl?.trim() ? value.primaryUrl : null
  }, [items, selectedResource, value.primaryResourceId, value.primaryUrl])

  const selectedIconSrc = useMemo(() => {
    // Prefer the resource favicon when present; otherwise fall back to the URL favicon proxy.
    if (value.primaryResourceId) {
      const found = items.find((i) => i.id === value.primaryResourceId) ?? null
      const favicon = (found?.favicon_url ?? selectedResource?.favicon_url ?? '').trim()
      if (favicon) return getFaviconProxyUrlFromIconUrl(favicon)
      const url = (found?.url ?? selectedResource?.url ?? '').trim()
      if (url) return getFaviconProxyUrl(url)
    }

    const url = (value.primaryUrl ?? '').trim()
    if (url) return getFaviconProxyUrl(url)
    return null
  }, [items, selectedResource, value.primaryResourceId, value.primaryUrl])

  const inputValue = useMemo(() => {
    // When the user is searching (or the popover is open), show the query in the input.
    // Otherwise show the selected label.
    if (open || query.trim()) return query
    return selectedLabel ?? ''
  }, [open, query, selectedLabel])

  const handleQueryChange = useCallback(
    (next: string) => {
      setQuery(next)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => fetchItems(next.trim()), 120)
    },
    [fetchItems]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.currentTarget.value
      setOpen(true)
      setShowAddForm(false)
      handleQueryChange(next)
    },
    [handleQueryChange]
  )

  const handlePickResource = useCallback(
    (r: SpotlightResource) => {
      onChange({ primaryResourceId: r.id, primaryUrl: r.url })
      setQuery('')
      setShowAddForm(false)
      close()
    },
    [close, onChange]
  )

  const handleSelectResourceValue = useCallback(
    (value: string) => {
      const id = String(value ?? '').trim()
      if (!id) return
      const found = items.find((x) => x.id === id)
      if (!found) return
      handlePickResource(found)
    },
    [handlePickResource, items]
  )

  const handleClear = useCallback(() => {
    onChange({ primaryResourceId: '', primaryUrl: '' })
    setQuery('')
    setShowAddForm(false)
    setOpen(false)
  }, [onChange])

  const handleOpen = useCallback(() => setOpen(true), [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        cancel()
        setQuery('')
        setShowAddForm(false)
      }
    },
    [cancel]
  )

  const initialAddState: ResourceActionState = { ok: false, message: '' }
  const [addState, addAction] = useActionState(createResourceAction, initialAddState)
  const newUrlInputRef = useRef<HTMLInputElement | null>(null)
  const [newUrlTouched, setNewUrlTouched] = useState(false)
  const [newUrlError, setNewUrlError] = useState('')

  const handleShowAddFormClick = useCallback(() => {
    setShowAddForm(true)
  }, [])

  const handleCancelAddClick = useCallback(() => {
    setShowAddForm(false)
  }, [])

  const validateNewUrl = useCallback((raw: string) => {
    const res = validateHttpUrlInput(raw, 'required')
    return res.ok ? '' : res.message
  }, [])

  const handleNewUrlBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setNewUrlTouched(true)
      setNewUrlError(validateNewUrl(e.currentTarget.value))
    },
    [validateNewUrl]
  )

  const handleNewUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!newUrlTouched) return
      setNewUrlError(validateNewUrl(e.currentTarget.value))
    },
    [newUrlTouched, validateNewUrl]
  )

  const handleAddFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const fd = new FormData(e.currentTarget)
      const raw = String(fd.get('url') ?? '')
      const nextError = validateNewUrl(raw)
      if (!nextError) return
      e.preventDefault()
      setNewUrlTouched(true)
      setNewUrlError(nextError)
      queueMicrotask(() => newUrlInputRef.current?.focus())
    },
    [validateNewUrl]
  )
  const submitNewUrlInvalid = !addState.ok && addState.message === 'Enter a valid URL.'
  const effectiveNewUrlError =
    (newUrlTouched && newUrlError) || (submitNewUrlInvalid ? 'Please enter a valid URL (include https://).' : '')
  const showNewUrlError = Boolean(effectiveNewUrlError)

  useEffect(() => {
    if (!addState.ok) return
    const createdId = addState.createdResourceId ?? ''
    const createdUrl = addState.createdUrl ?? ''
    if (!createdId || !createdUrl) return
    // Avoid sync setState in effect body per lint rule.
    queueMicrotask(() => {
      onChange({ primaryResourceId: createdId, primaryUrl: createdUrl })
      setShowAddForm(false)
      setQuery('')
      close()
    })
  }, [addState, close, onChange])

  const handleBackToSearchClick = useCallback(() => {
    setShowAddForm(false)
    // Refresh results once back (so the newly created item can appear quickly).
    fetchItems(query.trim())
  }, [fetchItems, query])

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleOpen()
      }
    },
    [handleOpen]
  )

  const handleInputFocus = useCallback(() => {
    setOpen(true)
  }, [])

  const handlePopoverOpenAutoFocus = useCallback((e: Event) => {
    // Keep focus in the trigger input so the user can type immediately after opening.
    e.preventDefault()
    queueMicrotask(() => inputRef.current?.focus())
  }, [])

  const handlePopoverInteractOutside = useCallback((e: Event) => {
    // Treat the trigger (input + icons) as "inside" so clicks there don't dismiss.
    const target = e.target
    if (!(target instanceof Node)) return
    if (triggerWrapRef.current?.contains(target)) e.preventDefault()
  }, [])

  const handlePopoverFocusOutside = useCallback((e: Event) => {
    // We intentionally keep focus on the input while the popover is open.
    // Prevent Radix from dismissing due to focus moving to the trigger.
    const target = e.target
    if (!(target instanceof Node)) return
    if (triggerWrapRef.current?.contains(target)) e.preventDefault()
  }, [])

  return (
    <div className="grid gap-2">
      <input type="hidden" name={resourceIdName} value={value.primaryResourceId} />
      <input type="hidden" name={urlName} value={value.primaryUrl} />

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <div ref={triggerWrapRef} className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              placeholder="Choose from resources…"
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleTriggerKeyDown}
              className={cn('pl-9 pr-10', !selectedLabel ? 'text-muted-foreground' : '')}
              aria-label="Primary app"
              aria-expanded={open}
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              {selectedIconSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedIconSrc} alt="" className="size-4 rounded-sm" referrerPolicy="no-referrer" />
              ) : (
                <Globe aria-hidden="true" className="size-4 opacity-60" />
              )}
            </div>
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
              {value.primaryResourceId || value.primaryUrl ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear app" onClick={handleClear}>
                  <X aria-hidden="true" className="size-4" />
                </Button>
              ) : (
                <ChevronDown aria-hidden="true" className="size-4 opacity-60 pointer-events-none -translate-x-[5px]" />
              )}
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-[320px] p-0"
          onOpenAutoFocus={handlePopoverOpenAutoFocus}
          onInteractOutside={handlePopoverInteractOutside}
          onFocusOutside={handlePopoverFocusOutside}
        >
          <div className="p-1.5">
            {showAddForm ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleBackToSearchClick}>
                    <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={close}>
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </div>

                <form action={addAction} className="grid gap-3 rounded-lg border border-border/40 bg-card/30 p-3" onSubmit={handleAddFormSubmit}>
                  <input type="hidden" name="workflowId" value={workflowId} />
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="primary-app-new-url">
                      URL
                    </label>
                    <Input
                      ref={newUrlInputRef}
                      id="primary-app-new-url"
                      name="url"
                      placeholder="https://…"
                      defaultValue={query.startsWith('http://') || query.startsWith('https://') ? query : ''}
                      autoComplete="off"
                      inputMode="url"
                      required
                      aria-invalid={showNewUrlError}
                      onBlur={handleNewUrlBlur}
                      onChange={handleNewUrlChange}
                    />
                    <p
                      className="text-xs text-destructive min-h-4"
                      role={showNewUrlError ? 'status' : undefined}
                      aria-live={showNewUrlError ? 'polite' : undefined}
                      aria-hidden={!showNewUrlError}
                    >
                      {showNewUrlError ? effectiveNewUrlError : '\u00A0'}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="primary-app-new-title">
                      Title (optional)
                    </label>
                    <Input id="primary-app-new-title" name="title" placeholder="Slack" autoComplete="off" />
                  </div>

                  {!addState.ok && addState.message && addState.message !== 'Enter a valid URL.' ? (
                    <p className="text-sm text-destructive">{addState.message}</p>
                  ) : null}

                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={handleCancelAddClick}>
                      Cancel
                    </Button>
                    <FormSubmitButton idleText="Add resource" pendingText="Adding…" size="sm" />
                  </div>
                </form>
              </div>
            ) : (
              <Command className="rounded-lg border-0 bg-transparent">
                <div className="flex items-center justify-between gap-2 px-2 pt-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{query.trim() ? 'Results' : 'Recent'}</p>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={close}>
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </div>

                <CommandList
                  className="h-[280px] overflow-y-auto px-1 pb-1 overflow-x-hidden overscroll-contain touch-pan-y"
                  onWheelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                >
                  {status === 'loading' && items.length === 0 ? <CommandEmpty>Loading…</CommandEmpty> : null}
                  {status === 'error' ? <CommandEmpty>Couldn’t load apps.</CommandEmpty> : null}
                  {status === 'ready' && items.length === 0 ? (
                    <CommandEmpty>
                      <div className="grid gap-3">
                        <p>No results.</p>
                        <Button type="button" variant="secondary" size="sm" onClick={handleShowAddFormClick}>
                          Add resource
                        </Button>
                      </div>
                    </CommandEmpty>
                  ) : null}

                  <CommandGroup>
                    {items.map((r) => (
                      <CommandItem key={r.id} value={r.id} onSelect={handleSelectResourceValue} className="rounded-lg">
                        <span className="flex min-w-0 items-center gap-2">
                          {(() => {
                            const iconSrc = r.favicon_url?.trim()
                              ? getFaviconProxyUrlFromIconUrl(r.favicon_url)
                              : r.url
                              ? getFaviconProxyUrl(r.url)
                              : null

                            return iconSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={iconSrc} alt="" className="size-4 shrink-0 rounded-sm" referrerPolicy="no-referrer" />
                            ) : (
                              <Globe aria-hidden="true" className="size-4 shrink-0 opacity-60" />
                            )
                          })()}
                          <span className="min-w-0">
                            <span className="block truncate">{r.title?.trim() ? r.title : r.url}</span>
                            {r.title?.trim() ? <span className="block truncate text-xs text-muted-foreground">{r.url}</span> : null}
                          </span>
                        </span>
                        <ExternalLink aria-hidden="true" className="ml-auto size-4 shrink-0 opacity-60" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}


