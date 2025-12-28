'use client'

import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'cerna-sidebar-collapsed'
const COOKIE_KEY = 'cerna-sidebar-collapsed'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

type SidebarContextValue = {
  isCollapsed: boolean
  isReady: boolean
  toggle: () => void
  expand: () => void
  collapse: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}

function setSidebarCookie(isCollapsed: boolean) {
  try {
    document.cookie = `${COOKIE_KEY}=${
      isCollapsed ? 'true' : 'false'
    }; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`
  } catch {
    // Ignore cookie errors
  }
}

type SidebarProviderProps = {
  children: ReactNode
  /** Server-provided initial state (cookie-backed) to prevent layout shift on reload */
  initialCollapsed?: boolean
}

export function SidebarProvider({ children, initialCollapsed = false }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  // We intentionally avoid "rehydrating" from localStorage here to prevent layout shift/hydration mismatch.
  // The server-provided cookie (`initialCollapsed`) is the source of truth for initial render.
  const isReady = true

  // Persist to localStorage on change (only after ready)
  useLayoutEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed))
    } catch {
      // Ignore localStorage errors
    }
    setSidebarCookie(isCollapsed)
  }, [isCollapsed])

  const toggle = useCallback(() => setIsCollapsed((prev) => !prev), [])
  const expand = useCallback(() => setIsCollapsed(false), [])
  const collapse = useCallback(() => setIsCollapsed(true), [])

  return (
    <SidebarContext.Provider value={{ isCollapsed, isReady, toggle, expand, collapse }}>
      {children}
    </SidebarContext.Provider>
  )
}
