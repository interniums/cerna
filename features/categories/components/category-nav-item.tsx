'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { FolderClosed } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/app/sidebar-context'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type CategoryNavItemProps = {
  workflowId: string
  id: string
  name: string
}

// Legacy component for backwards compatibility
export function CategoryNavItem({ workflowId, id, name }: CategoryNavItemProps) {
  const pathname = usePathname()
  const href = useMemo(() => `/app/w/${workflowId}/category/${id}`, [workflowId, id])
  const isActive = pathname === href
  const { isCollapsed, collapse } = useSidebar()

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isCollapsed) return
        if (e.defaultPrevented) return
        if (e.button !== 0) return
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
        collapse()
      }}
      className={cn(
        'block w-full min-w-0 rounded-md border border-transparent px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'border-primary/25 bg-primary/10 text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
    >
      <span className="block min-w-0 truncate">{name}</span>
    </Link>
  )
}

type CategoryNavItemCollapsibleProps = {
  workflowId: string
  id: string
  name: string
  icon?: LucideIcon
}

export function CategoryNavItemCollapsible({
  workflowId,
  id,
  name,
  icon: Icon = FolderClosed,
}: CategoryNavItemCollapsibleProps) {
  const pathname = usePathname()
  const { isCollapsed, collapse } = useSidebar()
  const href = useMemo(() => `/app/w/${workflowId}/category/${id}`, [workflowId, id])
  const isActive = pathname === href

  const content = (
    <Link
      href={href}
      onClick={(e) => {
        if (isCollapsed) return
        if (e.defaultPrevented) return
        if (e.button !== 0) return
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
        collapse()
      }}
      className={cn(
        'flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        isActive
          ? 'border-primary/25 bg-primary/10 text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {!isCollapsed ? <span className="min-w-0 truncate">{name}</span> : null}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
