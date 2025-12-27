import { redirect } from 'next/navigation'

import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
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

  const category = categories.find((c) => c.id === categoryId)
  if (!category) redirect(`/app/w/${workflowId}`)

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 pb-4 lg:pr-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <div className="flex items-center gap-2">
          <EditCategoryDialog categoryId={categoryId} initialName={category.name} />
        </div>
      </div>

      <div className="lg:pr-4">
        <Separator />
      </div>

      <div className="grid gap-6 pt-4 pb-24 lg:pr-4">
        <ResourceList resources={resources} />
      </div>

      {/* Sticky footer action (inside the scroll container). */}
      <div className="sticky bottom-0 z-20 pb-3 pt-2 lg:pr-4 bg-linear-to-t from-background via-background/70 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex justify-center">
          <NewResourceDialog categories={categories} workflowId={workflowId} defaultCategoryId={categoryId} trigger="wide" />
        </div>
      </div>
    </div>
  )
}


