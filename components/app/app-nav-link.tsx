'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/app/sidebar-context'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type AppNavLinkProps = {
  href: string
  children: React.ReactNode
  icon?: LucideIcon
  className?: string
}

export function AppNavLink({ href, children, icon: Icon, className }: AppNavLinkProps) {
  const pathname = usePathname()
  const { isCollapsed, collapse } = useSidebar()
  const isActive = pathname === href

  const content = (
    <Link
      href={href}
      onClick={(e) => {
        // Auto-close expanded sidebar only for a normal left-click navigation.
        if (isCollapsed) return
        if (e.defaultPrevented) return
        if (e.button !== 0) return
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
        collapse()
      }}
      className={cn(
        'flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors',
        'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        isActive && 'border-primary/25 bg-primary/10 text-foreground shadow-sm',
        isCollapsed && 'justify-center px-2',
        className
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
      {!isCollapsed ? <span className="min-w-0 truncate">{children}</span> : null}
    </Link>
  )

  // Show tooltip in collapsed mode
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {children}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
