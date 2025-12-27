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

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    // Prevent scroll chaining/bounce from nested scroll areas.
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscrollBehavior
    }
  }, [enabled])

  return null
}


