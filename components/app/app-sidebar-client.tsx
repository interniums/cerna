'use client'

import { LayoutDashboard, Sunrise, FolderOpen, FolderClosed, PanelLeftClose, PanelLeft, type LucideIcon } from 'lucide-react'

import type { Workflow } from '@/lib/db/workflows'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/app/sidebar-context'
import { AppNavLink } from '@/components/app/app-nav-link'
import { CategoryNavItemCollapsible } from '@/features/categories/components/category-nav-item'
import { NewCategoryDialog } from '@/components/app/new-category-dialog'
import { WorkflowSwitcherCollapsible } from '@/components/app/workflow-switcher'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Icon name to component mapping - resolved on the client
const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  morning: Sunrise,
  resources: FolderOpen,
}

type NavItem = {
  href: string
  label: string
  iconName: 'dashboard' | 'morning' | 'resources'
}

type CategoryItem = {
  id: string
  href: string
  name: string
}

type AppSidebarClientProps = {
  workflows: Workflow[]
  activeWorkflowId: string
  navItems: NavItem[]
  categoryItems: CategoryItem[]
  workflowId: string
}

export function AppSidebarClient({
  workflows,
  activeWorkflowId,
  navItems,
  categoryItems,
  workflowId,
}: AppSidebarClientProps) {
  const { isCollapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'flex h-full flex-col transition-[width] duration-200 ease-out',
        isCollapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Workflow switcher */}
      <div className={cn('mb-4', isCollapsed ? 'px-1' : '')}>
        <WorkflowSwitcherCollapsible workflows={workflows} activeWorkflowId={activeWorkflowId} />
      </div>

      {/* Library section */}
      {!isCollapsed ? (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Library</p>
        </div>
      ) : null}

      <nav className={cn('mt-2 grid gap-0.5', isCollapsed ? 'mt-0' : 'mt-3')}>
        {navItems.map((item) => (
          <AppNavLink key={item.href} href={item.href} icon={NAV_ICONS[item.iconName]}>
            {item.label}
          </AppNavLink>
        ))}
      </nav>

      <Separator className={cn('my-4', isCollapsed ? 'my-3' : '')} />

      {/* Sections */}
      {!isCollapsed ? (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</p>
          <NewCategoryDialog workflowId={workflowId} />
        </div>
      ) : (
        <div className="flex justify-center">
          <NewCategoryDialog workflowId={workflowId} iconOnly />
        </div>
      )}

      <div className={cn('mt-3 grid gap-0.5 content-start overflow-y-auto', isCollapsed ? 'mt-2' : '')}>
        {categoryItems.length === 0 ? (
          !isCollapsed ? (
            <p className="px-2 text-sm text-muted-foreground">No sections yet.</p>
          ) : null
        ) : (
          categoryItems.map((c) => (
            <CategoryNavItemCollapsible
              key={c.id}
              workflowId={workflowId}
              id={c.id}
              name={c.name}
              icon={FolderClosed}
            />
          ))
        )}
      </div>

      {/* Collapse toggle at bottom */}
      <div className={cn('mt-auto pt-4', isCollapsed ? 'flex justify-center' : '')}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggle}
                aria-label="Expand sidebar"
                className="text-muted-foreground hover:text-foreground"
              >
                <PanelLeft aria-hidden="true" className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose aria-hidden="true" className="size-4" />
            <span>Collapse</span>
          </Button>
        )}
      </div>
    </aside>
  )
}
