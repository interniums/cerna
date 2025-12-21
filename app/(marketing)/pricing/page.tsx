import type { Metadata } from 'next'

import { Container } from '@/components/site/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, paid-only pricing for Cerna.',
}

export default function PricingPage() {
  return (
    <main>
      <Container className="py-12 sm:py-16">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          One plan. Everything included.
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
          Cerna is paid-only to stay fast, calm, and sustainable.
        </p>

        <div className="mt-8 grid gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Cerna Pro</h2>
                <p className="mt-1 text-sm text-muted-foreground">Everything, billed monthly.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-tight">
                  $9<span className="text-sm text-muted-foreground">/mo</span>
                </div>
              </div>
            </div>
            <Button className="mt-6 w-full" asChild>
              <a href="/signup">Get started</a>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Cerna Pro</h2>
                <p className="mt-1 text-sm text-muted-foreground">Everything, billed yearly.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-tight">
                  $90<span className="text-sm text-muted-foreground">/yr</span>
                </div>
              </div>
            </div>
            <Button className="mt-6 w-full" variant="secondary" asChild>
              <a href="/signup">Best value</a>
            </Button>
          </Card>
        </div>
      </Container>
    </main>
  )
}
