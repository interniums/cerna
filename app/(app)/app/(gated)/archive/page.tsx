import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { UndoBanner } from '@/features/resources/components/undo-banner'

type ArchivePageProps = {
  searchParams?: { undo?: string }
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const user = await requireServerUser()
  const resources = await listResources({ userId: user.id, scope: 'archive' })
  const undoId = searchParams?.undo

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <NewResourceDialog />
      </div>

      {undoId ? <UndoBanner resourceId={undoId} /> : null}
      <ResourceList resources={resources} />
    </div>
  )
}
