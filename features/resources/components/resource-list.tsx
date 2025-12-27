'use client'

import Link from 'next/link'
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, Link2, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import type { Resource } from '@/lib/db/resources'
import { getResourceFaviconSrc } from '@/lib/url'
import {
  reorderPinnedResourcesAction,
  reorderResourcesAction,
  toggleEssentialStateAction,
  type ResourceActionState,
} from '@/features/resources/actions'
import { ResourceActionsDialog } from '@/features/resources/components/resource-actions-dialog'
import { Badge } from '@/components/ui/badge'
import { FormSubmitIconButton } from '@/components/forms/form-submit-icon-button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const initialState: ResourceActionState = { ok: false, message: '' }

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  )
}

function getPrimaryText(resource: Resource) {
  return resource.title?.trim() ? resource.title : resource.url
}

function getOutHref(resourceId: string) {
  return `/app/out/${resourceId}`
}

function getShortUrl(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    const host = u.hostname.replace(/^www\./, '')
    return host
  } catch {
    // If it's not a valid URL for some reason, fall back to a readable truncation.
    const cleaned = rawUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0] ?? rawUrl
    return cleaned.length > 48 ? `${cleaned.slice(0, 47)}…` : cleaned
  }
}

function EssentialToggle({ resourceId, isEssential }: { resourceId: string; isEssential: boolean }) {
  const router = useRouter()
  const [state, formAction] = useActionState(toggleEssentialStateAction, initialState)

  const label = isEssential ? 'Remove from quick access' : 'Add to quick access'

  useEffect(() => {
    if (!state.ok) return
    toast(isEssential ? 'Removed from quick access.' : 'Added to quick access.')
    router.refresh()
  }, [isEssential, router, state.ok])

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="resourceId" value={resourceId} />
      <Tooltip>
        <TooltipTrigger asChild>
          <FormSubmitIconButton
            size="icon-xs"
            variant="ghost"
            className="cerna-hover-control"
            aria-label={label}
            pendingLabel={label}
            idleIcon={
              isEssential ? <Star aria-hidden="true" className="text-yellow-500" fill="currentColor" /> : <Star aria-hidden="true" />
            }
          />
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{label}</TooltipContent>
      </Tooltip>
      {!state.ok && state.message ? (
        <p className="sr-only" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

function ResourceRow({
  r,
  dragHandleProps,
  showDragHandle = false,
  density = 'default',
}: {
  r: Resource
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  showDragHandle?: boolean
  density?: 'default' | 'compact'
}) {
  const faviconSrc = getResourceFaviconSrc(r)
  const compact = density === 'compact'

  return (
    <Card
      className={`cerna-hover-card group h-full ${compact ? 'min-h-[96px]' : 'min-h-[112px]'} max-w-full min-w-0 p-0 motion-reduce:transition-none`}
    >
      <div className="flex h-full max-w-full min-w-0 items-stretch gap-0">
        {showDragHandle ? (
          <div className="flex shrink-0 items-center pl-2 pr-1">
            <button
              type="button"
              aria-label="Reorder resource"
              disabled={!dragHandleProps}
              tabIndex={dragHandleProps ? 0 : -1}
              className={`grid place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 ${
                compact ? 'h-8 w-8' : 'h-9 w-9'
              }`}
              {...(dragHandleProps ?? {})}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
        <Link
          href={getOutHref(r.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${getPrimaryText(r)}`}
          className={`cerna-hover-card min-w-0 flex-1 ${showDragHandle ? '' : 'rounded-l-xl'} ${compact ? 'p-3' : 'p-4'} outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50`}
        >
          <div className="flex h-full min-w-0 items-center gap-3">
            <div
              className={`flex ${compact ? 'size-9' : 'size-10'} shrink-0 self-center items-center justify-center overflow-hidden rounded-md border bg-muted`}
            >
              {/* Icons: prefer favicon over OG/image tiles for consistency. */}
              {faviconSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faviconSrc} alt="" className={compact ? 'size-4' : 'size-5'} loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`truncate font-medium text-foreground ${compact ? 'text-[13px]' : 'text-sm'}`}>{getPrimaryText(r)}</span>
                {r.is_pinned ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    Pinned
                  </Badge>
                ) : null}
              </div>

              {r.notes ? (
                <p className={`mt-1 line-clamp-2 text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{r.notes}</p>
              ) : null}

              <div className="mt-2 flex min-w-0">
                <span
                  className={`inline-flex min-w-0 max-w-full items-center truncate rounded-md border border-border/70 bg-muted/60 font-medium text-muted-foreground ${
                    compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]'
                  }`}
                  title={r.url}
                >
                  {getShortUrl(r.url)}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Control rail (separate from the link). */}
        <div
          className={`flex ${compact ? 'w-12' : 'w-14'} shrink-0 flex-col items-center justify-center gap-1.5 rounded-r-xl border-l border-border/60 px-2 py-2`}
        >
          <EssentialToggle resourceId={r.id} isEssential={r.is_essential} />

          <ResourceActionsDialog resource={r} />
        </div>
      </div>
    </Card>
  )
}

function SortableResourceItem({ resource, density }: { resource: Resource; density?: 'default' | 'compact' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resource.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // dnd-kit listeners/attributes are safe to spread onto a button.
  const handleProps = { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>

  return (
    <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-80' : ''} min-w-0 max-w-full`}>
      <ResourceRow r={resource} dragHandleProps={handleProps} showDragHandle density={density} />
    </div>
  )
}

export function ResourceList({
  resources,
  workflowId,
  enableReorder = false,
}: {
  resources: Resource[]
  workflowId?: string
  enableReorder?: boolean
}) {
  const router = useRouter()
  const [dndReady, setDndReady] = useState(false)

  const pinned = useMemo(() => resources.filter((r) => r.is_pinned), [resources])
  const nonPinned = useMemo(() => resources.filter((r) => !r.is_pinned), [resources])

  const [pinnedOrder, setPinnedOrder] = useState<Resource[]>(pinned)
  const [nonPinnedOrder, setNonPinnedOrder] = useState<Resource[]>(nonPinned)
  useEffect(() => {
    queueMicrotask(() => setPinnedOrder(pinned))
    queueMicrotask(() => setNonPinnedOrder(nonPinned))
  }, [nonPinned, pinned])

  const canReorder = enableReorder && Boolean(workflowId) && nonPinnedOrder.length > 1
  const canUseDnd = canReorder && dndReady
  const canReorderPinned = enableReorder && Boolean(workflowId) && pinnedOrder.length > 1
  const canUsePinnedDnd = canReorderPinned && dndReady
  const [savingNonPinned, setSavingNonPinned] = useState(false)
  const [savingPinned, setSavingPinned] = useState(false)
  const saving = savingPinned || savingNonPinned
  const showSaveStatus = canReorder || canReorderPinned

  // Prevent accidental link navigation caused by the click that can fire after a pointer-up ends a drag.
  const suppressClickRef = useRef(false)

  const suppressClickNow = useCallback(() => {
    suppressClickRef.current = true
  }, [])

  const releaseSuppressClickSoon = useCallback(() => {
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }, [])

  const handleSuppressClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressClickRef.current) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const pinnedLatestIdsRef = useRef<string[]>([])
  const pinnedInFlightRef = useRef(false)
  const pinnedQueuedRef = useRef(false)
  const pinnedTimerRef = useRef<number | null>(null)
  const pinnedRequestIdRef = useRef(0)

  const latestIdsRef = useRef<string[]>([])
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const persistPinnedOrderIds = useCallback(async () => {
    if (!workflowId) return
    if (pinnedInFlightRef.current) {
      pinnedQueuedRef.current = true
      return
    }

    const ids = pinnedLatestIdsRef.current
    if (ids.length === 0) return

    pinnedInFlightRef.current = true
    setSavingPinned(true)

    const requestId = ++pinnedRequestIdRef.current
    try {
      const res = await reorderPinnedResourcesAction({ workflowId, resourceIds: ids })
      if (!res.ok) {
        // Keep microcopy consistent with the rest of the app.
        toast(res.message)
        console.error('[resources] reorder pinned failed', { workflowId, ids, res })
        return
      }
      if (requestId === pinnedRequestIdRef.current) router.refresh()
    } catch (error: unknown) {
      toast('Couldn’t reorder. Try again.')
      console.error('[resources] reorder pinned threw', { workflowId, ids, error })
    } finally {
      pinnedInFlightRef.current = false
      setSavingPinned(false)
      if (pinnedQueuedRef.current) {
        pinnedQueuedRef.current = false
        void persistPinnedOrderIds()
      }
    }
  }, [router, workflowId])

  const schedulePersistPinnedOrder = useCallback(
    (next: Resource[]) => {
      pinnedLatestIdsRef.current = next.map((r) => r.id)
      if (pinnedTimerRef.current) window.clearTimeout(pinnedTimerRef.current)
      pinnedTimerRef.current = window.setTimeout(() => {
        pinnedTimerRef.current = null
        void persistPinnedOrderIds()
      }, 1200)
    },
    [persistPinnedOrderIds]
  )

  const persistOrderIds = useCallback(async () => {
    if (!workflowId) return
    if (inFlightRef.current) {
      queuedRef.current = true
      return
    }

    const ids = latestIdsRef.current
    if (ids.length === 0) return

    inFlightRef.current = true
    setSavingNonPinned(true)

    const requestId = ++requestIdRef.current
    try {
      const res = await reorderResourcesAction({ workflowId, resourceIds: ids })
      if (!res.ok) {
        toast(res.message)
        console.error('[resources] reorder failed', { workflowId, ids, res })
        return
      }
      if (requestId === requestIdRef.current) router.refresh()
    } catch (error: unknown) {
      toast('Couldn’t reorder. Try again.')
      console.error('[resources] reorder threw', { workflowId, ids, error })
    } finally {
      inFlightRef.current = false
      setSavingNonPinned(false)
      if (queuedRef.current) {
        queuedRef.current = false
        void persistOrderIds()
      }
    }
  }, [router, workflowId])

  const schedulePersistOrder = useCallback(
    (next: Resource[]) => {
      latestIdsRef.current = next.map((r) => r.id)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void persistOrderIds()
      }, 1200)
    },
    [persistOrderIds]
  )

  useEffect(() => {
    // Avoid SSR hydration mismatches from dnd-kit generated ids/ARIA by enabling DnD only after mount.
    setDndReady(true)
    return () => {
      if (pinnedTimerRef.current) window.clearTimeout(pinnedTimerRef.current)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const handlePinnedDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canUsePinnedDnd) return
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = pinnedOrder.findIndex((t) => t.id === active.id)
      const newIndex = pinnedOrder.findIndex((t) => t.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(pinnedOrder, oldIndex, newIndex)
      setPinnedOrder(next)
      schedulePersistPinnedOrder(next)
    },
    [canUsePinnedDnd, pinnedOrder, schedulePersistPinnedOrder]
  )

  const handleDragStart = useCallback(() => {
    suppressClickNow()
  }, [suppressClickNow])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canReorder) return
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = nonPinnedOrder.findIndex((t) => t.id === active.id)
      const newIndex = nonPinnedOrder.findIndex((t) => t.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(nonPinnedOrder, oldIndex, newIndex)
      setNonPinnedOrder(next)
      schedulePersistOrder(next)
    },
    [canReorder, nonPinnedOrder, schedulePersistOrder]
  )

  const handlePinnedDragEndWithClickRelease = useCallback(
    (event: DragEndEvent) => {
      handlePinnedDragEnd(event)
      releaseSuppressClickSoon()
    },
    [handlePinnedDragEnd, releaseSuppressClickSoon]
  )

  const handleNonPinnedDragEndWithClickRelease = useCallback(
    (event: DragEndEvent) => {
      handleDragEnd(event)
      releaseSuppressClickSoon()
    },
    [handleDragEnd, releaseSuppressClickSoon]
  )

  if (resources.length === 0) {
    return (
      <Card className="max-w-full min-w-0 p-6">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </Card>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl 2xl:max-w-4xl min-w-0" onClickCapture={handleSuppressClickCapture}>
      <div className="grid max-w-full min-w-0 gap-3">
        {/* Prevent layout jump: reserved space for save status. */}
        {showSaveStatus ? (
          <p className="min-h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
            {saving ? 'Saving order…' : ''}
          </p>
        ) : null}

        {/* Pinned: top grid (prevents the “empty pinned column” problem). */}
        {pinnedOrder.length > 0 ? (
          <div className="grid min-w-0 content-start gap-3">
            <SectionHeader title="Pinned" count={pinnedOrder.length} />
            {canUsePinnedDnd ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handlePinnedDragEndWithClickRelease}
                onDragCancel={releaseSuppressClickSoon}
              >
                <SortableContext items={pinnedOrder.map((r) => r.id)} strategy={rectSortingStrategy}>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    {pinnedOrder.map((r) => (
                      <SortableResourceItem key={r.id} resource={r} density="compact" />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {pinnedOrder.map((r) => (
                  <ResourceRow key={r.id} r={r} density="compact" showDragHandle={canReorderPinned} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Others: full-width list below. */}
        {nonPinnedOrder.length > 0 ? (
          <div className="grid min-w-0 content-start gap-3">
            <SectionHeader title="Others" count={nonPinnedOrder.length} />
            {canUseDnd ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleNonPinnedDragEndWithClickRelease}
                onDragCancel={releaseSuppressClickSoon}
              >
                <SortableContext items={nonPinnedOrder.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid min-w-0 content-start gap-3">
                    {nonPinnedOrder.map((r) => (
                      <SortableResourceItem key={r.id} resource={r} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid min-w-0 content-start gap-3">
                {nonPinnedOrder.map((r) => (
                  <ResourceRow key={r.id} r={r} showDragHandle={canReorder} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
