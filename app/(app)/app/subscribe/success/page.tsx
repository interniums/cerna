import Link from 'next/link'
import { redirect } from 'next/navigation'

import { hasActiveEntitlement } from '@/lib/billing/entitlements'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { requireServerUser } from '@/lib/supabase/auth'

export default async function SubscribeSuccessPage() {
  const user = await requireServerUser()
  const isActive = await hasActiveEntitlement(user.id)

  if (isActive) redirect('/app')

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Almost done</h1>
      <Card className="grid gap-3 p-6">
        <p className="text-sm text-muted-foreground">Payment received. We’re activating your subscription now.</p>
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
  )
}
