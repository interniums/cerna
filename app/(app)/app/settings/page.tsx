import Link from 'next/link'

import { openBillingPortalAction } from '@/app/(app)/app/settings/actions'
import { hasActiveEntitlement } from '@/lib/billing/entitlements'
import { requireServerUser } from '@/lib/supabase/auth'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function SettingsPage() {
  const user = await requireServerUser()
  const isActive = await hasActiveEntitlement(user.id)

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Card className="p-6">
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isActive ? (
              <form action={openBillingPortalAction} className="sm:max-w-xs">
                <FormSubmitButton className="w-full" idleText="Open Billing" pendingText="Opening…" />
              </form>
            ) : (
              <Button asChild className="sm:max-w-xs">
                <Link href="/app/subscribe">Subscribe</Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Billing uses Stripe’s secure customer portal.</p>
        </div>
      </Card>
    </div>
  )
}
