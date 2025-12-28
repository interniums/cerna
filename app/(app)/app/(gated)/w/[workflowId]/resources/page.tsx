import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'

type WorkflowResourcesPageProps = {
  params: Promise<{ workflowId: string }>
}

export default async function WorkflowResourcesPage({ params }: WorkflowResourcesPageProps) {
  const user = await requireServerUser()
  const { workflowId } = await params

  const [categories, resources] = await Promise.all([
    listCategories({ userId: user.id, workflowId }),
    listResources({ userId: user.id, workflowId, scope: 'all' }),
  ])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {/* Keep title fixed; only the content below should scroll. */}
      <div className="shrink-0 pt-6">
        <div className="flex flex-col gap-3 pb-6 lg:pr-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden lg:pr-4">
        <div className="grid gap-6 pb-24">
          <ResourceList resources={resources} workflowId={workflowId} enableReorder />
        </div>

        {/* Sticky footer action (inside the scroll container). */}
        <div className="sticky bottom-0 z-20 pb-3 pt-2 bg-linear-to-t from-background via-background/70 to-transparent pointer-events-none">
          <div className="pointer-events-auto flex justify-center">
            <NewResourceDialog categories={categories} workflowId={workflowId} trigger="wide" />
          </div>
        </div>
      </div>
    </div>
  )
}
