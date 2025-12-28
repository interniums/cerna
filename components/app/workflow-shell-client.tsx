'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { SidebarProvider } from '@/components/app/sidebar-context'
import { useSidebar } from '@/components/app/sidebar-context'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'
import { cn } from '@/lib/utils'

type WorkflowShellClientProps = {
  sidebar: ReactNode
  header: ReactNode
  afterHeader?: ReactNode
  children: ReactNode
  workflowTheme?: string
  initialSidebarCollapsed?: boolean
}

function SidebarOverlay({ sidebar }: { sidebar: ReactNode }) {
  const { isCollapsed, collapse } = useSidebar()

  useEffect(() => {
    if (isCollapsed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      collapse()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [collapse, isCollapsed])

  return (
    <>
      {/* Backdrop only when expanded (intentional overlay mode). */}
      {!isCollapsed ? (
        <div
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px]"
          aria-hidden="true"
          onClick={() => collapse()}
        />
      ) : null}

      {/* Sidebar - overlays main content */}
      <div className="fixed bottom-0 left-3 top-3 z-40 pb-3 sm:left-4 md:left-6">{sidebar}</div>
    </>
  )
}

function WorkflowShellFrame({
  sidebar,
  header,
  afterHeader,
  children,
  workflowTheme,
}: {
  sidebar: ReactNode
  header: ReactNode
  afterHeader?: ReactNode
  children: ReactNode
  workflowTheme?: string
}) {
  const { isCollapsed } = useSidebar()

  return (
    <div
      className={cn(
        'relative h-full min-h-0 min-w-0 overflow-x-hidden px-4 pt-3 pb-0 md:px-6',
        // When collapsed, reserve space for the docked rail so it never overlaps main content.
        // (Expanded state remains an intentional overlay.)
        isCollapsed && 'pl-[84px] sm:pl-[88px] md:pl-[96px]'
      )}
      data-workflow-theme={workflowTheme}
    >
      {/* Main content */}
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-6xl flex-col">
          <div className="pb-2 min-w-0">
            <div className="min-w-0">{header}</div>
          </div>

          {afterHeader}
          <ScrollYFade className="flex-1 min-h-0" viewportClassName="overflow-y-auto overflow-x-hidden">
            {children}
          </ScrollYFade>
        </div>
      </div>

      <SidebarOverlay sidebar={sidebar} />
    </div>
  )
}

export function WorkflowShellClient({
  sidebar,
  header,
  afterHeader,
  children,
  workflowTheme,
  initialSidebarCollapsed = false,
}: WorkflowShellClientProps) {
  return (
    <SidebarProvider initialCollapsed={initialSidebarCollapsed}>
      <WorkflowShellFrame sidebar={sidebar} header={header} afterHeader={afterHeader} workflowTheme={workflowTheme}>
        {children}
      </WorkflowShellFrame>
    </SidebarProvider>
  )
}
