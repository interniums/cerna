import Link from 'next/link'

import { Container } from '@/components/site/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function MarketingHomePage() {
  return (
    <main>
      <section className="border-b border-border/60">
        <Container className="py-16 sm:py-24">
          <Badge variant="secondary">Cerna</Badge>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Your calm home base for web resources.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Keep your daily links close, save what matters for later, and find anything instantly with smart search.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Paid-only. No clutter. Built for speed.</p>
        </Container>
      </section>

      <section>
        <Container className="grid gap-4 py-12 sm:grid-cols-3 sm:py-16">
          <Card className="p-5">
            <h2 className="text-sm font-semibold tracking-tight">Quick access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Categories + pinned links so your essentials are always one click away.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold tracking-tight">Save for later</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Notes, tags, unread/archive. Keep everything tidy without losing context.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold tracking-tight">Smart search</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keyword + semantic search. Find “that doc about onboarding” in seconds.
            </p>
          </Card>
        </Container>
      </section>
    </main>
  )
}
