import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/site/container'
import { Logo } from '@/components/brand/logo'
import { requireServerUser } from '@/lib/supabase/auth'
import { CommandPalette } from '@/components/app/command-palette'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireServerUser()

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/60">
        <Container className="flex h-14 items-center justify-between">
          <Logo href="/app" />
          <nav className="flex items-center gap-4 text-sm">
            <div className="hidden sm:block">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/app/search">Search</Link>
              </Button>
            </div>
            <Link href="/app" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/app/settings" className="text-muted-foreground hover:text-foreground">
              Settings
            </Link>
          </nav>
        </Container>
      </header>
      <main>
        <Container className="py-10">{children}</Container>
      </main>
      <CommandPalette />
    </div>
  )
}
