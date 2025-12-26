import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'

type WorkflowPinnedPageProps = {
  params: Promise<{ workflowId: string }>
}

export default async function WorkflowPinnedPage({ params }: WorkflowPinnedPageProps) {
  const user = await requireServerUser()
  const { workflowId } = await params

  const [categories, resources] = await Promise.all([
    listCategories({ userId: user.id, workflowId }),
    listResources({ userId: user.id, workflowId, scope: 'pinned' }),
  ])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 pr-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pinned</h1>
      </div>

      <div className="relative flex-1 min-h-0">
        <ScrollYFade className="h-full" viewportClassName="pr-4 pb-40">
          <div className="grid gap-6 pt-4 pb-4">
            <ResourceList resources={resources} />
          </div>
        </ScrollYFade>

        <div className="pointer-events-none absolute inset-x-0 -bottom-6 pr-4">
          <div className="pointer-events-auto pt-12 pb-2 bg-linear-to-t from-background via-background/80 to-transparent">
            <NewResourceDialog categories={categories} workflowId={workflowId} trigger="wide" />
          </div>
        </div>
      </div>
    </div>
  )
}


