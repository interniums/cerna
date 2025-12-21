import { startCheckoutAction } from '@/app/(app)/app/subscribe/actions'
import { Card } from '@/components/ui/card'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type SubscribePageProps = {
  searchParams?: { interval?: 'monthly' | 'yearly' }
}

export default function SubscribePage({ searchParams }: SubscribePageProps) {
  const selected = searchParams?.interval === 'yearly' ? 'yearly' : 'monthly'

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Subscribe</h1>
      <Card className="grid gap-3 p-6">
        <p className="text-sm text-muted-foreground">
          Cerna is paid-only. Subscribe to unlock your dashboard and start saving resources.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant={selected === 'monthly' ? 'default' : 'secondary'}>
            <Link href="/app/subscribe?interval=monthly">Monthly</Link>
          </Button>
          <Button asChild variant={selected === 'yearly' ? 'default' : 'secondary'}>
            <Link href="/app/subscribe?interval=yearly">Yearly</Link>
          </Button>
        </div>
        <form action={startCheckoutAction} className="grid gap-2">
          <input type="hidden" name="interval" value={selected} />
          <FormSubmitButton className="w-full" idleText="Continue to checkout" pendingText="Opening checkout…" />
        </form>
        <p className="text-xs text-muted-foreground">You can manage or cancel anytime in Billing.</p>
      </Card>
    </div>
  )
}
