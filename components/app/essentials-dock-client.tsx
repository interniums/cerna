'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Link2, Plus, Settings, Timer } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  MeasuringStrategy,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import { cn } from '@/lib/utils'
import { getHost, getResourceFaviconSrc } from '@/lib/url'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import type { Category } from '@/lib/db/categories'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EssentialsAddDialog } from '@/components/app/essentials-add-dialog'
import { OpenSpotlightButton } from '@/components/app/open-spotlight-button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { reorderEssentialsAction } from '@/features/resources/actions'
import type { Task } from '@/lib/db/tasks'
import { FocusModeCard } from '@/features/focus/components/focus-mode-card'
import { usePomodoroBadge } from '@/features/focus/pomodoro-store'

type EssentialsItem = {
  id: string
  url: string
  title: string | null
  favicon_url: string | null
  image_url: string | null
}

export type InitialPomodoroBadge = {
  isActive: boolean
  label: string | null
}

const DOCK_SCROLL_BY_PX = 220

function PomodoroSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      <Skeleton className="h-[92px] w-full rounded-xl" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <Skeleton className="h-4 w-[420px] max-w-full" />
    </div>
  )
}

function PomodoroModalButton({
  workflowId,
  initialPomodoroBadge,
}: {
  workflowId: string
  initialPomodoroBadge?: InitialPomodoroBadge
}) {
  const hydrated = useHydrated()
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const pomodoro = usePomodoroBadge(workflowId)
  const tooltipCooldownRef = useRef<number | null>(null)
  const isActive = !hydrated
    ? Boolean(initialPomodoroBadge?.isActive)
    : pomodoro.isActive || Boolean(initialPomodoroBadge?.isActive)
  const activeLabel = ((hydrated ? pomodoro.label : null) ?? initialPomodoroBadge?.label ?? null) as string | null

  useEffect(() => {
    return () => {
      if (tooltipCooldownRef.current) window.clearTimeout(tooltipCooldownRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const res = await fetch(`/api/tasks/list?workflowId=${encodeURIComponent(workflowId)}`, { method: 'GET' })
        const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; tasks?: Task[] } | null
        if (!res.ok || !json?.ok || !Array.isArray(json.tasks)) {
          throw new Error(json?.message || 'Couldn’t load tasks.')
        }
        if (cancelled) return
        setTasks(json.tasks)
      } catch (e: unknown) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Couldn’t load tasks.')
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, workflowId])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          // Never show tooltip while modal is open.
          setTooltipOpen(false)
          return
        }
        // When closing, cursor is often still over the trigger; suppress tooltip briefly to avoid the "pop on close" glitch.
        setTooltipOpen(false)
        if (tooltipCooldownRef.current) window.clearTimeout(tooltipCooldownRef.current)
        tooltipCooldownRef.current = window.setTimeout(() => {
          tooltipCooldownRef.current = null
        }, 350)
      }}
    >
      <Tooltip
        delayDuration={0}
        open={tooltipOpen && !open && tooltipCooldownRef.current == null}
        onOpenChange={(next) => {
          if (open) return
          if (tooltipCooldownRef.current != null) return
          setTooltipOpen(next)
        }}
      >
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={isActive && activeLabel ? `Open Pomodoro (${activeLabel})` : 'Open Pomodoro'}
            >
              <Timer aria-hidden="true" />
              {/* Active indicator only (keep time in tooltip). */}
              {isActive ? (
                <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />
              ) : null}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          <div className="grid gap-0.5">
            <span className="text-sm">Pomodoro</span>
            {isActive && activeLabel ? (
              <span className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
                {activeLabel} left
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Not running</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-[min(680px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Pomodoro</DialogTitle>
        </DialogHeader>
        <div className={cn('min-h-[360px]', pomodoro.isActive ? 'flex items-center justify-center' : '')}>
          {loading ? (
            <PomodoroSkeleton />
          ) : error ? (
            <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-6">
              <p className="text-sm font-medium">Couldn’t load tasks</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <FocusModeCard workflowId={workflowId} tasks={tasks} variant="plain" showTitle={false} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const collisionDetection: CollisionDetection = (args) => {
  // For horizontal sortable lists, pointer-based collisions feel much more accurate than "closest center",
  // especially near the edges of a scroll container.
  const pointer = pointerWithin(args)
  if (pointer.length > 0) return pointer
  return closestCenter(args)
}

function getPrimaryText(url: string, title: string | null) {
  const t = title?.trim()
  return t ? t : url
}

function getIconAltText(url: string, title: string | null) {
  const label = getPrimaryText(url, title)
  const host = getHost(url)
  return label === host ? label : `${label} (${host})`
}

function DockIconContent({ item }: { item: EssentialsItem }) {
  const faviconSrc = getResourceFaviconSrc(item)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/app/out/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${getIconAltText(item.url, item.title)}`}
          className="group block rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
          draggable={false}
        >
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl border bg-muted transition-transform duration-200 ease-out motion-reduce:transition-none group-hover:scale-[1.03] group-active:scale-[0.99]">
            {faviconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faviconSrc}
                alt=""
                className="size-5 saturate-75 dark:saturate-100"
                loading="lazy"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            ) : (
              <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>
        <div className="grid gap-0.5">
          <span className="text-sm">{getPrimaryText(item.url, item.title)}</span>
          <span className="text-xs text-muted-foreground">{getHost(item.url)}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function StaticDockIcon({ item }: { item: EssentialsItem }) {
  return (
    <div data-essentials-dnd-item className="shrink-0">
      <DockIconContent item={item} />
    </div>
  )
}

function SortableDockIcon({ item }: { item: EssentialsItem }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: 'transform, opacity',
  }

  return (
    <div
      ref={setNodeRef}
      data-essentials-dnd-item
      style={style}
      className={cn('shrink-0', isDragging ? 'relative z-10 opacity-90' : '')}
    >
      <div ref={setActivatorNodeRef} data-essentials-dnd-item {...attributes} {...listeners}>
        <DockIconContent item={item} />
      </div>
    </div>
  )
}

function useEssentialsOrderPersistence({
  workflowId,
  onPersistSuccess,
}: {
  workflowId: string
  onPersistSuccess: () => void
}) {
  const latestIdsRef = useRef<string[]>([])
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const persistOrderIds = useCallback(async () => {
    if (inFlightRef.current) {
      queuedRef.current = true
      return
    }
    const ids = latestIdsRef.current
    if (ids.length === 0) return

    inFlightRef.current = true
    try {
      const res = await reorderEssentialsAction({ workflowId, resourceIds: ids })
      if (!res.ok) {
        toast(res.message)
        return
      }
      onPersistSuccess()
    } catch {
      toast('Couldn’t reorder. Try again.')
    } finally {
      inFlightRef.current = false
      if (queuedRef.current) {
        queuedRef.current = false
        void persistOrderIds()
      }
    }
  }, [onPersistSuccess, workflowId])

  const schedulePersistOrder = useCallback(
    (next: EssentialsItem[]) => {
      latestIdsRef.current = next.map((i) => i.id)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void persistOrderIds()
      }, 1200)
    },
    [persistOrderIds]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  return { schedulePersistOrder }
}

function useDockScrollAffordances({ dndReady }: { dndReady: boolean }) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const startScrollLeftRef = useRef(0)
  const didDragRef = useRef(false)

  const [isDragging, setIsDragging] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollAffordances = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(remaining > 1)
  }, [])

  const beginDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      const el = viewportRef.current
      if (!el) return
      // If the user is dragging an icon, let DnD handle it (don't start scroll-drag).
      if (dndReady && e.target instanceof HTMLElement && e.target.closest('[data-essentials-dnd-item]')) return

      pointerIdRef.current = e.pointerId
      startXRef.current = e.clientX
      startScrollLeftRef.current = el.scrollLeft
      didDragRef.current = false
      setIsDragging(true)

      // Keep receiving move events even if pointer leaves the element.
      el.setPointerCapture(e.pointerId)
    },
    [dndReady]
  )

  const updateDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      const el = viewportRef.current
      if (!el) return
      if (pointerIdRef.current !== e.pointerId) return

      const dx = e.clientX - startXRef.current
      if (!didDragRef.current && Math.abs(dx) > 5) didDragRef.current = true
      el.scrollLeft = startScrollLeftRef.current - dx
      updateScrollAffordances()
    },
    [isDragging, updateScrollAffordances]
  )

  const endDrag = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current
    if (el && e && pointerIdRef.current === e.pointerId) {
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        // noop
      }
    }
    pointerIdRef.current = null
    setIsDragging(false)
  }, [])

  const preventClickAfterDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!didDragRef.current) return
    e.preventDefault()
    e.stopPropagation()
    didDragRef.current = false
  }, [])

  useEffect(() => {
    updateScrollAffordances()
    const el = viewportRef.current
    if (!el) return

    const ro = new ResizeObserver(() => updateScrollAffordances())
    ro.observe(el)

    // Content size can change after images load.
    const firstChild = el.firstElementChild
    if (firstChild) ro.observe(firstChild)

    return () => ro.disconnect()
  }, [updateScrollAffordances])

  return {
    viewportRef,
    isDragging,
    canScrollLeft,
    canScrollRight,
    updateScrollAffordances,
    beginDrag,
    updateDrag,
    endDrag,
    preventClickAfterDrag,
  }
}

export function EssentialsDockClient({
  essentials,
  categories,
  workflowId,
  initialPomodoroBadge,
}: {
  essentials: EssentialsItem[]
  categories: Category[]
  workflowId: string
  initialPomodoroBadge?: InitialPomodoroBadge
}) {
  const router = useRouter()
  const dndReady = useHydrated()
  const suppressClickRef = useRef(false)

  const {
    viewportRef,
    isDragging,
    canScrollLeft,
    canScrollRight,
    updateScrollAffordances,
    beginDrag,
    updateDrag,
    endDrag,
    preventClickAfterDrag,
  } = useDockScrollAffordances({ dndReady })

  const [order, setOrder] = useState<EssentialsItem[]>(essentials)
  useEffect(() => {
    queueMicrotask(() => setOrder(essentials))
  }, [essentials])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { schedulePersistOrder } = useEssentialsOrderPersistence({
    workflowId,
    onPersistSuccess: () => router.refresh(),
  })

  const suppressClickNow = useCallback(() => {
    suppressClickRef.current = true
  }, [])

  const releaseSuppressClickSoon = useCallback(() => {
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }, [])

  const handleDockDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)

      const oldIndex = order.findIndex((t) => t.id === activeId)
      const newIndex = order.findIndex((t) => t.id === overId)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(order, oldIndex, newIndex)
      setOrder(next)
      schedulePersistOrder(next)
      // Note: DnD can trigger click after drop; we already suppress clicks during drag.
    },
    [order, schedulePersistOrder]
  )

  const handleDockDragStart = useCallback(() => {
    suppressClickNow()
  }, [suppressClickNow])

  const handleDockDragEndWithCleanup = useCallback(
    (event: DragEndEvent) => {
      handleDockDragEnd(event)
      releaseSuppressClickSoon()
    },
    [handleDockDragEnd, releaseSuppressClickSoon]
  )

  const handleDockDragCancel = useCallback(() => {
    releaseSuppressClickSoon()
  }, [releaseSuppressClickSoon])

  const preventClickAfterDnd = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const scrollByAmount = useCallback(
    (delta: number) => {
      const el = viewportRef.current
      if (!el) return
      el.scrollBy({ left: delta, behavior: 'smooth' })
    },
    [viewportRef]
  )

  const handleScrollLeft = useCallback(() => {
    scrollByAmount(-DOCK_SCROLL_BY_PX)
  }, [scrollByAmount])

  const handleScrollRight = useCallback(() => {
    scrollByAmount(DOCK_SCROLL_BY_PX)
  }, [scrollByAmount])

  return (
    <div className="w-full">
      {/* Top bar container: anchors logo + dock + controls so they don't feel like floating islands. */}
      <div className="rounded-3xl bg-transparent shadow-none backdrop-blur-xl supports-backdrop-filter:bg-transparent px-3 py-2 sm:px-4">
        {/* "Header" row: logo (left) + essentials (center) + action (right) */}
        <div className="grid min-h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center justify-start">
            <Logo href="/app" withWordmark={false} />
          </div>

          {/* Essentials + Pomodoro button row */}
          <div className="flex w-fit max-w-full items-center justify-center gap-2">
            <div
              data-essentials-bar
              className={cn(
                'relative inline-flex max-w-full overflow-hidden rounded-2xl border bg-card shadow-none backdrop-blur-md supports-backdrop-filter:bg-card/80',
                // Light mode: avoid “dirty” shadow; use diffuse + low alpha + clean border.
                'border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
                // Dark mode: keep existing look.
                'dark:border-white/15 dark:shadow-none'
              )}
            >
              <div className="flex min-h-[60px] items-center gap-0.5 px-1 py-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="cerna-hover-control"
                  aria-label="Scroll shortcuts left"
                  aria-disabled={!canScrollLeft}
                  onClick={handleScrollLeft}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>

                {/* Constrain the scroll viewport so the dock doesn't become a huge full-width bar. */}
                <div className="relative w-[560px] max-w-[calc(100vw-22rem)] min-w-0">
                  {/* Always-on fades (SSR-safe; no "late load" on refresh). */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-linear-to-r from-card/95 to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-linear-to-l from-card/95 to-transparent"
                  />
                  <div
                    ref={viewportRef}
                    className={cn(
                      'cerna-no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto px-1 py-1',
                      isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                    )}
                    style={{ touchAction: 'pan-y' }}
                    onScroll={updateScrollAffordances}
                    onPointerDown={beginDrag}
                    onPointerMove={updateDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClickCapture={preventClickAfterDrag}
                  >
                    {dndReady ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={collisionDetection}
                        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                        onDragStart={handleDockDragStart}
                        onDragEnd={handleDockDragEndWithCleanup}
                        onDragCancel={handleDockDragCancel}
                      >
                        <SortableContext items={order.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                          <div onClickCapture={preventClickAfterDnd} className="flex items-center gap-2">
                            {order.map((r) => (
                              <SortableDockIcon key={r.id} item={r} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      // SSR + initial hydration-safe render: avoid motion/animation wrappers to prevent mismatches.
                      <div className="flex items-center gap-2">
                        {order.map((r) => (
                          <StaticDockIcon key={r.id} item={r} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="cerna-hover-control"
                  aria-label="Scroll shortcuts right"
                  aria-disabled={!canScrollRight}
                  onClick={handleScrollRight}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>

                {/* Add button integrated into the dock capsule to reduce visual clutter. */}
                <EssentialsAddDialog
                  categories={categories}
                  workflowId={workflowId}
                  triggerLabel="Add shortcut"
                  triggerTooltip="Add a shortcut"
                  trigger={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="cerna-hover-control"
                      aria-label="Add a shortcut"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </Button>
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="flex items-center gap-1">
              <OpenSpotlightButton />
              <PomodoroModalButton workflowId={workflowId} initialPomodoroBadge={initialPomodoroBadge} />
              <ThemeToggle />
              <Button asChild variant="ghost" size="icon-sm" aria-label="Settings">
                <Link href="/app/settings">
                  <Settings aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
