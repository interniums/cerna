import Link from 'next/link'

import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  withWordmark?: boolean
  href?: string
}

export function Logo({ className, withWordmark = true, href = '/' }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      aria-label="Cerna home"
    >
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-foreground text-background">
        <span className="text-sm font-semibold tracking-tight">C</span>
      </span>
      {withWordmark ? <span className="text-sm font-semibold tracking-tight">Cerna</span> : null}
    </Link>
  )
}
