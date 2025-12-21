'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type AppNavLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
}

export function AppNavLink({ href, children, className }: AppNavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
        isActive && 'bg-accent text-foreground',
        className
      )}
    >
      {children}
    </Link>
  )
}
