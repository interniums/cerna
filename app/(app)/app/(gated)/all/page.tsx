import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { UndoBanner } from '@/features/resources/components/undo-banner'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'
import { Separator } from '@/components/ui/separator'

type AllPageProps = {
  searchParams?: Promise<{ undo?: string }>
}

export default async function AllResourcesPage({ searchParams }: AllPageProps) {
  const user = await requireServerUser()
  const resources = await listResources({ userId: user.id, scope: 'all' })
  const pinned = resources.filter((r) => r.is_pinned)
  const other = resources.filter((r) => !r.is_pinned)
  const params = (await searchParams) ?? {}
  const undoId = params.undo

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 pr-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All</h1>
        <NewResourceDialog trigger="icon" />
      </div>

      {undoId ? <UndoBanner resourceId={undoId} /> : null}
      <ScrollYFade className="flex-1" viewportClassName="pr-4">
        <div className="pt-4 pb-4">
          {resources.length === 0 ? (
            <ResourceList resources={resources} />
          ) : pinned.length > 0 && other.length > 0 ? (
            <div className="grid gap-4">
              <div className="grid gap-3">
                <h2 className="text-sm font-semibold tracking-tight">Pinned</h2>
                <ResourceList resources={pinned} />
              </div>
              <Separator />
              <div className="grid gap-3">
                <h2 className="text-sm font-semibold tracking-tight">Other</h2>
                <ResourceList resources={other} />
              </div>
            </div>
          ) : pinned.length > 0 ? (
            <div className="grid gap-3">
              <h2 className="text-sm font-semibold tracking-tight">Pinned</h2>
              <ResourceList resources={pinned} />
            </div>
          ) : (
            <ResourceList resources={other} />
          )}
        </div>
      </ScrollYFade>
    </div>
  )
}
