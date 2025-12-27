'use client'

import { useRef } from 'react'

import { cn } from '@/lib/utils'

type ScrollYFadeProps = {
  className?: string
  viewportClassName?: string
  fade?: boolean
  children: React.ReactNode
}

export function ScrollYFade({ className, viewportClassName, fade = true, children }: ScrollYFadeProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className={cn('relative flex min-h-0 flex-col', className)}>
      <div ref={viewportRef} className={cn('h-full overflow-y-auto overflow-x-hidden', viewportClassName)}>
        {children}
      </div>
      {fade ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent"
        />
      ) : null}
    </div>
  )
}
