'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

type ScrollYFadeProps = {
  className?: string
  viewportClassName?: string
  children: React.ReactNode
}

export function ScrollYFade({ className, viewportClassName, children }: ScrollYFadeProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  const update = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowBottomFade(remaining > 1)
  }, [])

  function handleScroll() {
    update()
  }

  useEffect(() => {
    update()
    const el = viewportRef.current
    if (!el) return

    const ro = new ResizeObserver(() => update())
    ro.observe(el)

    // Also observe content size changes.
    const firstChild = el.firstElementChild
    if (firstChild) ro.observe(firstChild)

    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [update])

  return (
    <div className={cn('relative flex min-h-0 flex-col', className)}>
      <div ref={viewportRef} onScroll={handleScroll} className={cn('h-full overflow-y-auto overflow-x-hidden', viewportClassName)}>
        {children}
      </div>
      {showBottomFade ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-background to-transparent"
        />
      ) : null}
    </div>
  )
}
