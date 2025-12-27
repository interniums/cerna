import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { Separator } from '@/components/ui/separator'

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
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <div className="grid gap-6 pr-4 pt-4 pb-24">
        <ResourceList resources={resources} workflowId={workflowId} enableReorder />
      </div>

      {/* Sticky footer action (inside the scroll container). */}
      <div className="sticky bottom-0 z-20 pr-4 pb-4 pt-3 bg-linear-to-t from-background via-background/85 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex justify-center">
          <NewResourceDialog categories={categories} workflowId={workflowId} trigger="wide" />
        </div>
      </div>
    </div>
  )
}
