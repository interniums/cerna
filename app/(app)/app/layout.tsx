import type { Metadata } from 'next'

import { Container } from '@/components/site/container'
import { requireServerUser } from '@/lib/supabase/auth'
import { CommandPalette } from '@/components/app/command-palette'
import { SpotlightDataProvider } from '@/components/app/spotlight-data'
import { BodyScrollLock } from '@/components/app/body-scroll-lock'

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
    <div className="fixed inset-0 overflow-hidden">
      <BodyScrollLock />

      <main className="h-full overflow-hidden">
        <Container className="flex h-full min-h-0 max-w-none flex-col pt-0 pb-0">
          <div className="flex-1 min-h-0">{children}</div>
        </Container>
      </main>

      <SpotlightDataProvider>
        <CommandPalette />
      </SpotlightDataProvider>
    </div>
  )
}
