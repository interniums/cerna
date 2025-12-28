'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { useSpotlightData } from '@/components/app/spotlight-data'

type CommandPaletteProps = {
  defaultOpen?: boolean
}

import {
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_MAX,
  getOutHref,
  getPrimaryText,
  isCommandPaletteShortcut,
  isTypingTarget,
  makeResourceValue,
  parseResourceIdFromValue,
  readRecentSearches,
} from '@/components/app/spotlight-utils'

export function CommandPalette({ defaultOpen = false }: CommandPaletteProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceRef = useRef<number | null>(null)
  const { items, status, fetchForQuery, cancel } = useSpotlightData()
  // Avoid reading localStorage during SSR/initial hydration render (causes hydration mismatch).
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    queueMicrotask(() => setRecentSearches(readRecentSearches()))
  }, [])

  const trimmedQuery = query.trim()
  const hasQuery = Boolean(trimmedQuery)

  const close = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = null
    setOpen(false)
    setQuery('')
    cancel()
  }, [cancel])

  const openSpotlight = useCallback(() => {
    setOpen(true)
    // Focus after the dialog mounts.
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) close()
      else openSpotlight()
    },
    [close, openSpotlight]
  )

  const persistRecentSearch = useCallback(
    (nextQuery: string) => {
      const q = nextQuery.trim()
      if (!q) return
      const next = [q, ...recentSearches.filter((x) => x !== q)].slice(0, RECENT_SEARCHES_MAX)
      setRecentSearches(next)
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [recentSearches]
  )

  const handleSelectRecentSearchValue = useCallback(
    (value: string) => {
      setQuery(value)
      fetchForQuery(value)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    },
    [fetchForQuery]
  )

  const openResourceById = useCallback((resourceId: string) => {
    window.open(getOutHref(resourceId), '_blank', 'noopener,noreferrer')
  }, [])

  const handleSelectResourceValue = useCallback(
    (value: string) => {
      if (hasQuery) persistRecentSearch(trimmedQuery)
      close()
      openResourceById(parseResourceIdFromValue(value))
    },
    [close, hasQuery, openResourceById, persistRecentSearch, trimmedQuery]
  )

  const handleQueryValueChange = useCallback(
    (next: string) => {
      setQuery(next)
      if (!open) return

      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        fetchForQuery(next.trim())
      }, 120)
    },
    [fetchForQuery, open]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      if (isCommandPaletteShortcut(event)) {
        event.preventDefault()
        if (open) {
          close()
        } else {
          openSpotlight()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, open, openSpotlight])

  useEffect(() => {
    function onOpenEvent() {
      openSpotlight()
    }
    window.addEventListener('cerna:open-spotlight', onOpenEvent)
    return () => window.removeEventListener('cerna:open-spotlight', onOpenEvent)
  }, [openSpotlight])

  const resources = useMemo(() => items, [items])

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleDialogOpenChange}
      showCloseButton={false}
      className="max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-popover/80 p-0 shadow-2xl backdrop-blur-xl"
    >
      <CommandInput ref={inputRef} placeholder="Search…" value={query} onValueChange={handleQueryValueChange} />
      <CommandList className="max-h-[360px] px-1 pb-1">
        {status === 'error' ? <CommandEmpty>Couldn’t load results.</CommandEmpty> : null}

        {!hasQuery && recentSearches.length > 0 ? (
          <CommandGroup heading="Recent searches">
            {recentSearches.map((q) => (
              <CommandItem key={q} value={q} onSelect={handleSelectRecentSearchValue} className="rounded-lg">
                <span className="min-w-0 truncate">{q}</span>
                <CommandShortcut>↩</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandGroup heading={hasQuery ? 'Results' : 'Recent'}>
          {resources.map((r) => (
            <CommandItem
              key={r.id}
              value={makeResourceValue(r)}
              onSelect={handleSelectResourceValue}
              className="rounded-lg"
            >
              <span className="min-w-0 truncate">{getPrimaryText(r)}</span>
              <CommandShortcut className="flex items-center gap-1">
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </CommandShortcut>
            </CommandItem>
          ))}

          {status === 'ready' && resources.length === 0 ? <CommandEmpty>No results.</CommandEmpty> : null}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
