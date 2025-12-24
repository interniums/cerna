import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { UndoBanner } from '@/features/resources/components/undo-banner'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'

type PinnedPageProps = {
  searchParams?: Promise<{ undo?: string }>
}

export default async function PinnedPage({ searchParams }: PinnedPageProps) {
  const user = await requireServerUser()
  const resources = await listResources({ userId: user.id, scope: 'pinned' })
  const params = (await searchParams) ?? {}
  const undoId = params.undo

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 pr-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pinned</h1>
        <NewResourceDialog trigger="icon" />
      </div>

      {undoId ? <UndoBanner resourceId={undoId} /> : null}
      <ScrollYFade className="flex-1" viewportClassName="pr-4">
        <div className="pt-4 pb-4">
          <ResourceList resources={resources} />
        </div>
      </ScrollYFade>
    </div>
  )
}
