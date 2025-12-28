import Link from 'next/link'

import { requireServerUser } from '@/lib/supabase/auth'
import { listExternalItems } from '@/lib/db/external-items'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import {
  convertExternalItemToNoteAction,
  convertExternalItemToTaskAction,
  syncAsanaNowAction,
  syncNotionNowAction,
  syncSlackNowAction,
} from '@/app/(app)/app/(gated)/w/[workflowId]/inbox/actions'

type InboxPageProps = {
  params: Promise<{ workflowId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const user = await requireServerUser()
  const { workflowId } = await params
  const sp = (await searchParams) ?? {}
  const sync = firstString(sp.sync)
  const provider = firstString(sp.provider) ?? ''

  const items = await listExternalItems({ userId: user.id, provider: provider || undefined, limit: 100 })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 pt-1">
        <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground">Slack mentions imported as link-only items.</p>
          </div>
          <div className="flex gap-2">
            <form action={syncSlackNowAction}>
              <input type="hidden" name="workflowId" value={workflowId} />
              <FormSubmitButton idleText="Sync Slack" pendingText="Syncing…" />
            </form>
            <form action={syncNotionNowAction}>
              <input type="hidden" name="workflowId" value={workflowId} />
              <FormSubmitButton idleText="Sync Notion" pendingText="Syncing…" variant="secondary" />
            </form>
            <form action={syncAsanaNowAction}>
              <input type="hidden" name="workflowId" value={workflowId} />
              <FormSubmitButton idleText="Sync Asana" pendingText="Syncing…" variant="secondary" />
            </form>
            <Button asChild variant="secondary">
              <Link href={`/app/w/${workflowId}`}>Back to dashboard</Link>
            </Button>
          </div>
        </div>
        {sync === 'error' ? (
          <p className="text-sm text-destructive">Sync failed. Please reconnect the integration in Settings and try again.</p>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pt-0 pb-6">
        <div className="grid gap-3">
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant={provider ? 'secondary' : 'default'}>
                <Link href={`/app/w/${workflowId}/inbox`}>All</Link>
              </Button>
              <Button asChild size="sm" variant={provider === 'slack' ? 'default' : 'secondary'}>
                <Link href={`/app/w/${workflowId}/inbox?provider=slack`}>Slack</Link>
              </Button>
              <Button asChild size="sm" variant={provider === 'notion' ? 'default' : 'secondary'}>
                <Link href={`/app/w/${workflowId}/inbox?provider=notion`}>Notion</Link>
              </Button>
              <Button asChild size="sm" variant={provider === 'asana' ? 'default' : 'secondary'}>
                <Link href={`/app/w/${workflowId}/inbox?provider=asana`}>Asana</Link>
              </Button>
            </div>
          </Card>

          {items.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">No items yet. Click “Sync Slack”.</p>
            </Card>
          ) : (
            items.map((it) => (
              <Card key={it.id} className="p-4">
                <div className="grid gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{it.title ?? 'External item'}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground/80">{it.provider}</span>
                        {it.author ? ` · ${it.author}` : null}
                        {' · '}
                        {it.occurred_at ? new Date(it.occurred_at).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <a href={it.external_url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                      <form action={convertExternalItemToNoteAction}>
                        <input type="hidden" name="workflowId" value={workflowId} />
                        <input type="hidden" name="externalItemId" value={it.id} />
                        <FormSubmitButton idleText="Save as note" pendingText="Saving…" variant="secondary" className="h-9" />
                      </form>
                      <form action={convertExternalItemToTaskAction}>
                        <input type="hidden" name="workflowId" value={workflowId} />
                        <input type="hidden" name="externalItemId" value={it.id} />
                        <FormSubmitButton idleText="Convert to task" pendingText="Creating…" variant="default" className="h-9" />
                      </form>
                    </div>
                  </div>

                  {it.summary ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{it.summary}</p>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


