import Link from 'next/link'
import { redirect } from 'next/navigation'

import { hasActiveEntitlement } from '@/lib/billing/entitlements'
import { isBillingEnabled } from '@/lib/billing/mode'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { requireServerUser } from '@/lib/supabase/auth'

export default async function SubscribeSuccessPage() {
  const user = await requireServerUser()
  if (!isBillingEnabled()) redirect('/app')

  const isActive = await hasActiveEntitlement(user.id)

  if (isActive) redirect('/app')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-col justify-center gap-4 py-10">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Almost done</h1>
            <p className="text-sm text-muted-foreground">Payment received. We’re activating your subscription now.</p>
          </div>

          <Card className="grid gap-3 p-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/app/subscribe/success">Refresh</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/app/settings">Go to Billing</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If this takes longer than a minute, check Billing or try signing out and back in.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
