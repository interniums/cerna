'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Link2, Plus } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
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
import type { Category } from '@/lib/db/categories'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EssentialsAddDialog } from '@/components/app/essentials-add-dialog'
import { reorderEssentialsAction } from '@/features/resources/actions'

type EssentialsItem = {
  id: string
  url: string
  title: string | null
  favicon_url: string | null
  image_url: string | null
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

function DockIcon({ item }: { item: EssentialsItem }) {
  return (
    <motion.div
      data-essentials-dnd-item
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ willChange: 'transform, opacity' }}
      className="shrink-0"
    >
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
              {(() => {
                const faviconSrc = getResourceFaviconSrc(item)
                return faviconSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconSrc}
                    alt=""
                    className="size-5"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                ) : (
                  <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
                )
              })()}
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
    </motion.div>
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
                {/* Essentials: keep icons consistent — prefer favicon over OG/image tiles. */}
                {(() => {
                  const faviconSrc = getResourceFaviconSrc(item)
                  return faviconSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={faviconSrc}
                      alt=""
                      className="size-5"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                  ) : (
                    <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
                  )
                })()}
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
      </div>
    </div>
  )
}

export function EssentialsDockClient({
  essentials,
  categories,
  workflowId,
}: {
  essentials: EssentialsItem[]
  categories: Category[]
  workflowId: string
}) {
  const router = useRouter()
  const [dndReady, setDndReady] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const startScrollLeftRef = useRef(0)
  const didDragRef = useRef(false)
  const suppressClickRef = useRef(false)

  const [isDragging, setIsDragging] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const [order, setOrder] = useState<EssentialsItem[]>(essentials)
  useEffect(() => {
    queueMicrotask(() => setOrder(essentials))
  }, [essentials])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
      router.refresh()
    } catch {
      toast('Couldn’t reorder. Try again.')
    } finally {
      inFlightRef.current = false
      if (queuedRef.current) {
        queuedRef.current = false
        void persistOrderIds()
      }
    }
  }, [router, workflowId])

  const suppressClickNow = useCallback(() => {
    suppressClickRef.current = true
  }, [])

  const releaseSuppressClickSoon = useCallback(() => {
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }, [])

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
      didDragRef.current = true // prevent click-open after a reorder
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

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

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

  const preventClickAfterDnd = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  useEffect(() => {
    // Avoid SSR hydration mismatches from dnd-kit generated ids/ARIA by enabling DnD only after mount.
    setDndReady(true)
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

  const viewportMaskImage = useMemo(() => {
    const fadePx = 28
    // Use a mask so content fades out instead of getting hard-clipped or "painted over".
    if (canScrollLeft && canScrollRight) {
      return `linear-gradient(to right, transparent 0px, black ${fadePx}px, black calc(100% - ${fadePx}px), transparent 100%)`
    }
    if (canScrollLeft && !canScrollRight) {
      return `linear-gradient(to right, transparent 0px, black ${fadePx}px, black 100%)`
    }
    if (!canScrollLeft && canScrollRight) {
      return `linear-gradient(to right, black 0px, black calc(100% - ${fadePx}px), transparent 100%)`
    }
    return 'none'
  }, [canScrollLeft, canScrollRight])

  const scrollByAmount = useCallback((delta: number) => {
    const el = viewportRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  const handleScrollLeft = useCallback(() => {
    scrollByAmount(-220)
  }, [scrollByAmount])

  const handleScrollRight = useCallback(() => {
    scrollByAmount(220)
  }, [scrollByAmount])

  return (
    <div className="w-full">
      <div className="flex w-full items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm backdrop-blur-md supports-backdrop-filter:bg-card/80 dark:border-white/15 dark:shadow-md">
            <div className="flex min-h-[60px] items-center gap-0.5 px-1 py-1">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="cerna-hover-control"
                aria-label="Scroll shortcuts left"
                disabled={!canScrollLeft}
                onClick={handleScrollLeft}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>

              <div className="relative min-w-0 flex-1">
                <div
                  ref={viewportRef}
                  className={cn(
                    'cerna-no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto px-1 py-1',
                    isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                  )}
                  style={{
                    touchAction: 'pan-y',
                    WebkitMaskImage: viewportMaskImage,
                    maskImage: viewportMaskImage,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskSize: '100% 100%',
                    maskSize: '100% 100%',
                  }}
                  onScroll={updateScrollAffordances}
                  onPointerDown={beginDrag}
                  onPointerMove={updateDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClickCapture={preventClickAfterDrag}
                >
                  <MotionConfig reducedMotion="user">
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
                      <AnimatePresence initial={false} mode="popLayout">
                        {order.map((r) => (
                          <DockIcon key={r.id} item={r} />
                        ))}
                      </AnimatePresence>
                    )}
                  </MotionConfig>
                </div>
              </div>

              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="cerna-hover-control"
                aria-label="Scroll shortcuts right"
                disabled={!canScrollRight}
                onClick={handleScrollRight}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Add button sits outside the dock capsule (always visible). */}
        <div className="shrink-0">
          <EssentialsAddDialog
            categories={categories}
            workflowId={workflowId}
            triggerLabel="Add shortcut"
            triggerTooltip="Add a shortcut"
            trigger={
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="h-[60px] w-[60px] rounded-2xl"
                aria-label="Add a shortcut"
              >
                <Plus aria-hidden="true" className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
