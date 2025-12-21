import Link from 'next/link'

import { Container } from '@/components/site/container'

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <Container className="flex flex-col gap-3 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Cerna. All rights reserved.</p>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </Container>
    </footer>
  )
}
