import type { Metadata } from 'next'
import Link from 'next/link'
import { Settings } from 'lucide-react'

import { Container } from '@/components/site/container'
import { Logo } from '@/components/brand/logo'
import { requireServerUser } from '@/lib/supabase/auth'
import { CommandPalette } from '@/components/app/command-palette'
import { Button } from '@/components/ui/button'
import { OpenSpotlightButton } from '@/components/app/open-spotlight-button'
import { SpotlightDataProvider } from '@/components/app/spotlight-data'
import { ThemeToggle } from '@/components/theme/theme-toggle'

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
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <Container className="flex h-14 max-w-none items-center justify-between">
          <Logo href="/app" />
          <nav className="flex items-center gap-4 text-sm">
            <OpenSpotlightButton />
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon-sm" aria-label="Settings">
              <Link href="/app/settings">
                <Settings aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </Container>
      </header>
      <main className="flex-1 overflow-hidden">
        <Container className="flex h-full min-h-0 max-w-none flex-col py-10">
          <div className="flex-1 min-h-0">{children}</div>
        </Container>
      </main>
      <SpotlightDataProvider>
        <CommandPalette />
      </SpotlightDataProvider>
    </div>
  )
}
