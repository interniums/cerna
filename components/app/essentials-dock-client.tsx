'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Link2, Plus } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { getHost, getResourceFaviconSrc } from '@/lib/url'
import type { Category } from '@/lib/db/categories'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EssentialsAddDialog } from '@/components/app/essentials-add-dialog'

type EssentialsItem = {
  id: string
  url: string
  title: string | null
  favicon_url: string | null
  image_url: string | null
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

export function EssentialsDockClient({
  essentials,
  categories,
  workflowId,
}: {
  essentials: EssentialsItem[]
  categories: Category[]
  workflowId: string
}) {
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

  const beginDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = viewportRef.current
    if (!el) return

    pointerIdRef.current = e.pointerId
    startXRef.current = e.clientX
    startScrollLeftRef.current = el.scrollLeft
    didDragRef.current = false
    setIsDragging(true)

    // Keep receiving move events even if pointer leaves the element.
    el.setPointerCapture(e.pointerId)
  }, [])

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

  const layoutTransition = useMemo(() => {
    return { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as const }
  }, [])

  const fadeTransition = useMemo(() => {
    return { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] as const }
  }, [])

  return (
    <div className="flex w-full items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm backdrop-blur-md supports-backdrop-filter:bg-card/80 dark:border-white/15 dark:shadow-md">
          <div className="flex min-h-[68px] items-center gap-1 px-1 py-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cerna-hover-control"
              aria-label="Scroll essentials left"
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
                  <AnimatePresence initial={false} mode="popLayout">
                    {essentials.map((r) => (
                      <motion.div
                        key={r.id}
                        layout="position"
                        transition={{ layout: layoutTransition, opacity: fadeTransition }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ willChange: 'transform, opacity' }}
                        className="shrink-0"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/app/out/${r.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${getIconAltText(r.url, r.title)}`}
                              className="group block rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                              draggable={false}
                            >
                              <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl border bg-muted transition-transform motion-reduce:transition-none group-hover:scale-[1.06]">
                                {/* Essentials: keep icons consistent — prefer favicon over OG/image tiles. */}
                                {(() => {
                                  const faviconSrc = getResourceFaviconSrc(r)
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
                              <span className="text-sm">{getPrimaryText(r.url, r.title)}</span>
                              <span className="text-xs text-muted-foreground">{getHost(r.url)}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </MotionConfig>
              </div>
            </div>

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cerna-hover-control"
              aria-label="Scroll essentials right"
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
          triggerLabel="Add an essential"
          triggerTooltip="Add to essentials"
          trigger={
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="h-14 w-14 rounded-xl"
              aria-label="Add an essential"
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          }
        />
      </div>
    </div>
  )
}
