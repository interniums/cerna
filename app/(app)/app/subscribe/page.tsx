import { redirect } from 'next/navigation'
import { startCheckoutAction } from '@/app/(app)/app/subscribe/actions'
import { Card } from '@/components/ui/card'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isBillingEnabled } from '@/lib/billing/mode'

type SubscribePageProps = {
  searchParams?: Promise<{ interval?: 'monthly' | 'yearly' }>
}

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  if (!isBillingEnabled()) redirect('/app')

  const params = (await searchParams) ?? {}
  const selected = params.interval === 'yearly' ? 'yearly' : 'monthly'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-col justify-center gap-4 py-10">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subscribe</h1>
            <p className="text-sm text-muted-foreground">Unlock your dashboard and keep everything in sync.</p>
          </div>

          <Card className="grid gap-3 p-6">
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
            <p className="text-xs text-muted-foreground">Manage or cancel anytime in Billing.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
