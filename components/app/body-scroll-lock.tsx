'use client'

import { useLayoutEffect } from 'react'

type BodyScrollLockProps = {
  enabled?: boolean
}

export function BodyScrollLock({ enabled = true }: BodyScrollLockProps) {
  useLayoutEffect(() => {
    if (!enabled) return

    const html = document.documentElement
    const body = document.body

    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyOverscrollBehavior = body.style.overscrollBehavior
    const hadStableGutter = html.classList.contains('scrollbar-gutter-stable')

    // Reserve scrollbar gutter so toggling overflow doesn't cause layout shifts.
    // This is especially important in React Strict Mode where effects mount/unmount twice in dev.
    if (!hadStableGutter) html.classList.add('scrollbar-gutter-stable')

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    // Prevent scroll chaining/bounce from nested scroll areas.
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscrollBehavior
      if (!hadStableGutter) html.classList.remove('scrollbar-gutter-stable')
    }
  }, [enabled])

  return null
}


