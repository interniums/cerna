import { redirect } from 'next/navigation'

import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'
import { EditCategoryDialog } from '@/features/categories/components/edit-category-dialog'
import { Separator } from '@/components/ui/separator'

type WorkflowCategoryPageProps = {
  params: Promise<{ workflowId: string; id: string }>
}

export default async function WorkflowCategoryPage({ params }: WorkflowCategoryPageProps) {
  const user = await requireServerUser()
  const { workflowId, id: categoryId } = await params

  const [categories, resources] = await Promise.all([
    listCategories({ userId: user.id, workflowId }),
    listResources({ userId: user.id, workflowId, scope: 'category', categoryId }),
  ])
  const pinned = resources.filter((r) => r.is_pinned)
  const other = resources.filter((r) => !r.is_pinned)

  const category = categories.find((c) => c.id === categoryId)
  if (!category) redirect(`/app/w/${workflowId}`)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <div className="flex items-center gap-2">
          <EditCategoryDialog categoryId={categoryId} initialName={category.name} />
        </div>
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <div className="relative flex-1 min-h-0">
        <ScrollYFade className="h-full" viewportClassName="pr-4 pb-40">
          <div className="grid gap-6 pt-4 pb-4">
            {resources.length === 0 ? (
              <ResourceList resources={resources} />
            ) : pinned.length > 0 && other.length > 0 ? (
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <h2 className="text-sm font-semibold tracking-tight">Pinned</h2>
                  <ResourceList resources={pinned} />
                </div>
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

        <div className="pointer-events-none absolute inset-x-0 -bottom-6 pr-4">
          <div className="pointer-events-auto pt-12 pb-2 bg-linear-to-t from-background via-background/80 to-transparent">
            <NewResourceDialog categories={categories} workflowId={workflowId} defaultCategoryId={categoryId} trigger="wide" />
          </div>
        </div>
      </div>
    </div>
  )
}


