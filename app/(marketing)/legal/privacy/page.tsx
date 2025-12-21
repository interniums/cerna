import type { Metadata } from 'next'

import { Container } from '@/components/site/container'

export const metadata: Metadata = {
  title: 'Privacy',
}

export default function PrivacyPage() {
  return (
    <main>
      <Container className="max-w-3xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          Cerna is built to be calm and trustworthy. This page will describe how we handle account data, saved
          resources, and billing data.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          MVP note: replace this placeholder with your final legal text before launch.
        </p>
      </Container>
    </main>
  )
}
