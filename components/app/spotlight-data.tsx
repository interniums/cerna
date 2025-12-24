'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type SpotlightResource = {
  id: string
  url: string
  title: string | null
  notes: string | null
  favicon_url: string | null
  image_url: string | null
  is_pinned: boolean
  is_favorite: boolean
}

type SpotlightStatus = 'idle' | 'loading' | 'ready' | 'error'

type SpotlightDataContextValue = {
  items: SpotlightResource[]
  status: SpotlightStatus
  fetchForQuery: (q: string) => void
  cancel: () => void
}

const SpotlightDataContext = createContext<SpotlightDataContextValue | null>(null)

export function SpotlightDataProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SpotlightResource[]>([])
  const [status, setStatus] = useState<SpotlightStatus>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const lastFetchedQueryRef = useRef<string | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const fetchForQuery = useCallback(
    (q: string) => {
      const query = q.trim()

      // Cache: avoid refetching the same query if we already have results.
      if (status === 'ready' && items.length > 0 && lastFetchedQueryRef.current === query) return

      cancel()
      const controller = new AbortController()
      abortRef.current = controller
      lastFetchedQueryRef.current = query

      setStatus('loading')

      void fetch('/api/resources/spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ q: query, limit: query ? 30 : 12 }),
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
    },
    [cancel, items.length, status]
  )

  // Prefetch recents on page entry (mount), avoiding sync setState in effect.
  useEffect(() => {
    // Schedule fetchForQuery('') after the first paint, to avoid cascading renders.
    const id = setTimeout(() => fetchForQuery(''), 0)
    return () => {
      clearTimeout(id)
      cancel()
    }
  }, [cancel, fetchForQuery])

  return (
    <SpotlightDataContext.Provider value={{ items, status, fetchForQuery, cancel }}>
      {children}
    </SpotlightDataContext.Provider>
  )
}

export function useSpotlightData() {
  const ctx = useContext(SpotlightDataContext)
  if (!ctx) throw new Error('useSpotlightData must be used within SpotlightDataProvider')
  return ctx
}
