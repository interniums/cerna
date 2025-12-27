'use client'

import type { ReactNode } from 'react'

import { SidebarProvider } from '@/components/app/sidebar-context'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'

type WorkflowShellClientProps = {
  sidebar: ReactNode
  header: ReactNode
  afterHeader?: ReactNode
  children: ReactNode
  workflowTheme?: string
  initialSidebarCollapsed?: boolean
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
      <div
        className="flex h-full min-h-0 min-w-0 gap-4 overflow-x-hidden px-4 pt-3 pb-0 sm:gap-6 md:px-6"
        data-workflow-theme={workflowTheme}
      >
        {/* Sidebar - always visible, collapsible */}
        <div className="shrink-0 pb-3">
          {sidebar}
        </div>

        {/* Main content */}
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="mb-2 min-w-0 pr-0 lg:pr-4">
            <div className="min-w-0">{header}</div>
          </div>

          {afterHeader}
          <ScrollYFade className="flex-1 min-h-0" viewportClassName="overflow-y-auto overflow-x-hidden">
            {children}
          </ScrollYFade>
        </div>
      </div>
    </SidebarProvider>
  )
}
