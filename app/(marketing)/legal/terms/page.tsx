import type { Metadata } from 'next'

import { Container } from '@/components/site/container'

export const metadata: Metadata = {
  title: 'Terms',
}

export default function TermsPage() {
  return (
    <main>
      <Container className="max-w-3xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          These terms will govern use of Cerna, subscriptions, and acceptable use.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          MVP note: replace this placeholder with your final legal text before launch.
        </p>
      </Container>
    </main>
  )
}
