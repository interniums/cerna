'use client'

import React, { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Link2 } from 'lucide-react'
import { toast } from 'sonner'

import type { Category } from '@/lib/db/categories'
import { cn } from '@/lib/utils'
import { getHost, getResourceFaviconSrc } from '@/lib/url'
import type { ResourceActionState } from '@/features/resources/actions'
import { addEssentialStateAction, createEssentialResourceAction } from '@/features/resources/actions'
import { ResourceCreateForm } from '@/features/resources/components/resource-create-form'
import { SectionSelect } from '@/components/forms/section-select'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type SpotlightResource = {
  id: string
  url: string
  title: string | null
  favicon_url: string | null
  is_essential: boolean
}

const initialState: ResourceActionState = { ok: false, message: '' }

function canonicalizeResourceUrl(rawUrl: string) {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    const protocol = u.protocol.toLowerCase()
    // Keep query (it can be meaningful) but drop hash; normalize trailing slash.
    const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/+$/, '')
    return `${protocol}//${host}${path}${u.search}`
  } catch {
    // Fallback: minimal normalization for non-URL strings.
    return trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase()
  }
}

function getPrimaryText(r: { title: string | null; url: string }) {
  return r.title?.trim() ? r.title : r.url
}

function ChooseExistingResultsList({
  rows,
  status,
  selected,
  onSelectedChange,
}: {
  rows: SpotlightResource[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  selected: Set<string>
  onSelectedChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const { pending } = useFormStatus()
  return (
    <div
      className={
        pending
          ? 'min-h-0 flex-1 overflow-hidden rounded-md border border-border/60 pointer-events-none'
          : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-border/60 bg-card shadow-sm'
      }
      aria-busy={pending}
    >
      {status === 'loading' ? (
        <div className="grid gap-0 border-border/60">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 border-b border-border/60 p-3 last:border-b-0">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="size-9 rounded-md" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : status === 'error' ? (
        <p className="p-3 text-sm text-muted-foreground">Couldn’t load resources.</p>
      ) : status === 'ready' && rows.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">No matches.</p>
      ) : (
        <div className="grid">
          {rows.map((r) => (
            <label
              key={r.id}
              className={cn(
                'hover:bg-accent hover:text-accent-foreground flex w-full min-w-0 cursor-pointer items-center gap-3 border-b border-border/60 p-3 text-left last:border-b-0',
                pending ? 'opacity-60 pointer-events-none' : ''
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-foreground"
                value={r.id}
                checked={selected.has(r.id)}
                disabled={pending}
                aria-disabled={pending}
                onChange={onSelectedChange}
              />
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {(() => {
                  const faviconSrc = getResourceFaviconSrc(r)
                  return faviconSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={faviconSrc} alt="" className="size-5" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
                  )
                })()}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{getPrimaryText(r)}</p>
                <p className="truncate text-xs text-muted-foreground">{getHost(r.url)}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function AddNewTab({ workflowId, categories, onDone }: { workflowId: string; categories: Category[]; onDone: () => void }) {
  return (
    <ResourceCreateForm
      action={createEssentialResourceAction}
      title="Add essentials"
      descriptionSrOnly="Add a new resource to your essentials dock."
      submitIdleText="Add to essentials"
      submitPendingText="Adding…"
      successToast="Added to essentials."
      onDone={onDone}
      hiddenInputs={<input type="hidden" name="workflowId" value={workflowId} />}
      extraFields={<SectionSelect categories={categories} defaultValue="" id="essential-category" label="Section" />}
      urlInputId="essential-url"
      titleInputId="essential-title"
      notesInputId="essential-notes"
      titlePlaceholder="Notion workspace"
    />
  )
}

function ChooseExistingTab({ workflowId, onDone }: { workflowId: string; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SpotlightResource[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const inFlight = useRef<AbortController | null>(null)

  const [state, formAction] = useActionState(addEssentialStateAction, initialState)
  const didCompleteRef = useRef(false)

  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (didCompleteRef.current) return
    if (!state.ok) return
    didCompleteRef.current = true
    toast('Added to essentials.')
    onDone()
  }, [onDone, state.ok])

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  const trimmed = query.trim()
  const limit = trimmed ? 30 : 12

  useEffect(() => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    // Avoid sync setState in effect body (can cause cascading renders per lint rule).
    queueMicrotask(() => setStatus('loading'))
    void fetch('/api/resources/spotlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ workflowId, q: trimmed, limit }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Bad response')
        const json = (await res.json()) as { ok: boolean; items?: SpotlightResource[] }
        setItems(json.items ?? [])
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setItems([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [limit, trimmed, workflowId])

  const list = useMemo(() => {
    const q = trimmed.toLowerCase()
    if (!q) return items
    return items.filter((r) => getPrimaryText(r).toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
  }, [items, trimmed])

  const nonEssentialList = useMemo(() => {
    // Hide duplicates: don't show non-essential rows that match an already-essential URL.
    const essentialUrls = new Set(
      list
        .filter((r) => r.is_essential)
        .map((r) => canonicalizeResourceUrl(r.url))
        .filter(Boolean)
    )

    const byUrl = new Map<string, SpotlightResource>()
    for (const r of list) {
      if (r.is_essential) continue
      const key = canonicalizeResourceUrl(r.url)
      if (!key) continue
      if (essentialUrls.has(key)) continue
      if (byUrl.has(key)) continue
      byUrl.set(key, r)
    }
    return Array.from(byUrl.values())
  }, [list])

  const allowedIds = useMemo(() => new Set(nonEssentialList.map((r) => r.id)), [nonEssentialList])

  const visibleSelected = useMemo(() => {
    if (selected.size === 0) return selected
    let changed = false
    const next = new Set<string>()
    for (const id of selected) {
      if (allowedIds.has(id)) next.add(id)
      else changed = true
    }
    return changed ? next : selected
  }, [allowedIds, selected])

  const selectedCount = visibleSelected.size

  const handleToggleSelected = useCallback((resourceId: string, nextChecked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (nextChecked) next.add(resourceId)
      else next.delete(resourceId)
      return next
    })
  }, [])

  const handleSelectedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleToggleSelected(e.currentTarget.value, e.currentTarget.checked)
    },
    [handleToggleSelected]
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="essential-search" className="text-muted-foreground">
          Search your resources
        </Label>
        <Input
          id="essential-search"
          placeholder="Search…"
          autoComplete="off"
          value={query}
          onChange={handleQueryChange}
        />
      </div>

      <form action={formAction} className="flex flex-1 min-h-0 flex-col gap-4">
        <input type="hidden" name="workflowId" value={workflowId} />
        {!state.ok && state.message ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {state.message}
          </p>
        ) : null}

        {selectedCount > 0 ? (
          <>
            {Array.from(visibleSelected).map((id) => (
              <input key={id} type="hidden" name="resourceId" value={id} />
            ))}
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
              Selected {selectedCount}.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select one or more resources to add.</p>
        )}

        <ChooseExistingResultsList
          rows={nonEssentialList}
          status={status}
          selected={visibleSelected}
          onSelectedChange={handleSelectedChange}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <FormSubmitButton
            className="w-full sm:w-auto"
            idleText="Add to essentials"
            pendingText="Adding…"
            disabled={selectedCount === 0 || status === 'loading'}
          />
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
        </div>
      </form>
    </div>
  )
}

export function EssentialsAddDialog({
  categories,
  workflowId,
  triggerLabel = 'Add to essentials',
  triggerTooltip,
  trigger,
}: {
  categories: Category[]
  workflowId: string
  triggerLabel?: string
  triggerTooltip?: string
  trigger?: React.ReactElement
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
  }, [])

  const handleTriggerClick = useCallback(() => {
    setOpen(true)
  }, [])

  function closeAndRefresh() {
    setOpen(false)
    router.refresh()
  }

  const triggerEl = useMemo(() => {
    return (
      trigger ?? (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={triggerLabel}>
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      )
    )
  }, [trigger, triggerLabel])

  const renderedTrigger = useMemo(() => {
    const mergedProps = {
      'aria-label': triggerEl.props['aria-label'] ?? triggerLabel,
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': open,
      onClick: handleTriggerClick,
    }
    return React.cloneElement(triggerEl, mergedProps)
  }, [handleTriggerClick, open, triggerEl, triggerLabel])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {triggerTooltip && !open ? (
        <Tooltip>
          <TooltipTrigger asChild>{renderedTrigger}</TooltipTrigger>
          <TooltipContent sideOffset={8}>{triggerTooltip}</TooltipContent>
        </Tooltip>
      ) : (
        renderedTrigger
      )}
      <DialogContent className="sm:h-[600px] sm:max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add essentials</DialogTitle>
          <DialogDescription className="sr-only">Add a resource to your essentials dock.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="choose" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger
              value="choose"
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:border-white/15"
            >
              Choose existing
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:border-white/15"
            >
              Add new
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 pt-4">
            <TabsContent value="choose" className="h-full">
              <ChooseExistingTab workflowId={workflowId} onDone={closeAndRefresh} />
            </TabsContent>
            <TabsContent value="new" className="h-full">
              <AddNewTab workflowId={workflowId} categories={categories} onDone={closeAndRefresh} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
