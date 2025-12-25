import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/site/container'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type SiteHeaderProps = {
  primaryCtaHref?: string
  primaryCtaLabel?: string
  logoHref?: string
}

export function SiteHeader({
  primaryCtaHref = '/signup',
  primaryCtaLabel = 'Get Cerna',
  logoHref = '/',
}: SiteHeaderProps) {
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Container className="flex h-14 items-center justify-between">
        <Logo href={logoHref} />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={primaryCtaHref}>{primaryCtaLabel}</Link>
          </Button>
        </nav>
      </Container>
    </header>
  )
}
