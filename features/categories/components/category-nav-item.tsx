'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

type CategoryNavItemProps = {
  id: string
  name: string
}

export function CategoryNavItem({ id, name }: CategoryNavItemProps) {
  const pathname = usePathname()
  const href = useMemo(() => `/app/category/${id}`, [id])
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'block w-full min-w-0 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <span className="block min-w-0 truncate">{name}</span>
    </Link>
  )
}
