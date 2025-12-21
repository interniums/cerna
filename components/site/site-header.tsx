import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/site/container'

type SiteHeaderProps = {
  primaryCtaHref?: string
}

export function SiteHeader({ primaryCtaHref = '/signup' }: SiteHeaderProps) {
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Container className="flex h-14 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={primaryCtaHref}>Get Cerna</Link>
          </Button>
        </nav>
      </Container>
    </header>
  )
}
