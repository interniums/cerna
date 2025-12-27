'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only after the component mounts in the browser.
 * Useful to avoid SSR/client hydration mismatches from non-deterministic render output
 * (locale/timezone formatting, time-based bucketing, libraries with non-SSR-stable ids, etc).
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Avoid calling setState synchronously inside the effect body (can trigger cascading renders warnings).
    // Defer to a microtask so React finishes the commit before we schedule a re-render.
    queueMicrotask(() => setHydrated(true))
  }, [])

  return hydrated
}


