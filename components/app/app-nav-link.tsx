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
  const { isCollapsed } = useSidebar()
  const isActive = pathname === href

  const content = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        isActive && 'bg-accent text-foreground',
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
