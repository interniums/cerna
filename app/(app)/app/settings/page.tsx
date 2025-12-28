import Link from 'next/link'

import {
  cancelSubscriptionAction,
  disconnectAsanaAction,
  disconnectNotionAction,
  disconnectSlackAction,
  manageBillingAction,
} from '@/app/(app)/app/settings/actions'
import { hasActiveEntitlement } from '@/lib/billing/entitlements'
import { isBillingEnabled } from '@/lib/billing/mode'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireServerUser } from '@/lib/supabase/auth'
import { listIntegrationAccounts } from '@/lib/db/integrations'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function SettingsPage() {
  const user = await requireServerUser()
  const billingEnabled = isBillingEnabled()
  const slackAccounts = await listIntegrationAccounts({ userId: user.id, provider: 'slack' })
  const notionAccounts = await listIntegrationAccounts({ userId: user.id, provider: 'notion' })
  const asanaAccounts = await listIntegrationAccounts({ userId: user.id, provider: 'asana' })

  const isActive = billingEnabled ? await hasActiveEntitlement(user.id) : false
  const supabase = billingEnabled ? await createSupabaseServerClient() : null

  const subscriptionRes = billingEnabled
    ? await supabase!
        .from('billing_subscriptions')
        .select('status, current_period_end, trial_end, cancel_at_period_end, plan_id')
        .eq('user_id', user.id)
        .maybeSingle()
    : null

  const subscription = subscriptionRes && !subscriptionRes.error ? subscriptionRes.data : null

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Card className="p-6">
        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-0.5">
              <p className="text-sm font-medium">Slack</p>
              <p className="text-xs text-muted-foreground">Connect your Slack workspace to import messages into your inbox.</p>
            </div>
            <Button asChild className="sm:max-w-xs">
              <Link href="/api/slack/connect?returnTo=/app/settings">Connect Slack</Link>
            </Button>
          </div>

          {slackAccounts.length > 0 ? (
            <div className="grid gap-2">
              {slackAccounts.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid gap-0.5">
                    <p className="text-sm">
                      Workspace: <span className="font-medium">{a.display_name ?? a.external_account_id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: <span className="text-foreground">{a.last_error ? 'Needs attention' : 'Connected'}</span>
                    </p>
                    {a.last_error ? <p className="text-xs text-destructive">{a.last_error}</p> : null}
                  </div>
                  <form action={disconnectSlackAction}>
                    <input type="hidden" name="accountId" value={a.id} />
                    <FormSubmitButton idleText="Disconnect" pendingText="Disconnecting…" variant="secondary" />
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No Slack workspaces connected.</p>
          )}
        </div>
      </Card>
      <Card className="p-6">
        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-0.5">
              <p className="text-sm font-medium">Notion</p>
              <p className="text-xs text-muted-foreground">Connect Notion to import recent pages (link-only).</p>
            </div>
            <Button asChild className="sm:max-w-xs" variant="secondary">
              <Link href="/api/notion/connect?returnTo=/app/settings">Connect Notion</Link>
            </Button>
          </div>

          {notionAccounts.length > 0 ? (
            <div className="grid gap-2">
              {notionAccounts.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid gap-0.5">
                    <p className="text-sm">
                      Workspace: <span className="font-medium">{a.display_name ?? a.external_account_id}</span>
                    </p>
                    {a.last_error ? <p className="text-xs text-destructive">{a.last_error}</p> : null}
                  </div>
                  <form action={disconnectNotionAction}>
                    <input type="hidden" name="accountId" value={a.id} />
                    <FormSubmitButton idleText="Disconnect" pendingText="Disconnecting…" variant="secondary" />
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No Notion workspaces connected.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-0.5">
              <p className="text-sm font-medium">Asana</p>
              <p className="text-xs text-muted-foreground">Connect Asana to import your open tasks (link-only).</p>
            </div>
            <Button asChild className="sm:max-w-xs" variant="secondary">
              <Link href="/api/asana/connect?returnTo=/app/settings">Connect Asana</Link>
            </Button>
          </div>

          {asanaAccounts.length > 0 ? (
            <div className="grid gap-2">
              {asanaAccounts.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid gap-0.5">
                    <p className="text-sm">
                      Account: <span className="font-medium">{a.display_name ?? a.external_account_id}</span>
                    </p>
                    {a.last_error ? <p className="text-xs text-destructive">{a.last_error}</p> : null}
                  </div>
                  <form action={disconnectAsanaAction}>
                    <input type="hidden" name="accountId" value={a.id} />
                    <FormSubmitButton idleText="Disconnect" pendingText="Disconnecting…" variant="secondary" />
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No Asana accounts connected.</p>
          )}
        </div>
      </Card>
      <Card className="p-6">
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>

          {billingEnabled ? (
            <>
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
                  {subscription?.trial_end ? <p>Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}</p> : null}
                  {subscription?.current_period_end ? (
                    <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                  ) : null}
                  {subscription?.cancel_at_period_end ? <p>Cancellation scheduled at period end.</p> : null}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Billing isn’t available yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
