import Link from 'next/link'

import { cancelSubscriptionAction, manageBillingAction } from '@/app/(app)/app/settings/actions'
import { hasActiveEntitlement } from '@/lib/billing/entitlements'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireServerUser } from '@/lib/supabase/auth'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function SettingsPage() {
  const user = await requireServerUser()
  const isActive = await hasActiveEntitlement(user.id)
  const supabase = await createSupabaseServerClient()

  const subscriptionRes = await supabase
    .from('billing_subscriptions')
    .select('status, current_period_end, trial_end, cancel_at_period_end, plan_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const subscription = subscriptionRes.error ? null : subscriptionRes.data

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
              <>
                <form action={manageBillingAction} className="sm:max-w-xs">
                  <FormSubmitButton className="w-full" idleText="Billing" pendingText="Loading…" />
                </form>
                <form action={cancelSubscriptionAction} className="sm:max-w-xs">
                  <FormSubmitButton
                    className="w-full"
                    idleText="Cancel subscription"
                    pendingText="Canceling…"
                    variant="secondary"
                  />
                </form>
              </>
            ) : (
              <Button asChild className="sm:max-w-xs">
                <Link href="/app/subscribe">Subscribe</Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            View your plan, update your payment method, or cancel anytime.
          </p>
          {isActive && (
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <p>
                Status: <span className="text-foreground">{subscription?.status ?? 'active'}</span>
              </p>
              {subscription?.trial_end ? (
                <p>Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}</p>
              ) : null}
              {subscription?.current_period_end ? (
                <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
              ) : null}
              {subscription?.cancel_at_period_end ? <p>Cancellation scheduled at period end.</p> : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
