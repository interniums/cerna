import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { UndoBanner } from '@/features/resources/components/undo-banner'

type CategoryPageProps = {
  params: { id: string }
  searchParams?: { undo?: string }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const user = await requireServerUser()
  const categoryId = params.id

  const [categories, resources] = await Promise.all([
    listCategories(user.id),
    listResources({ userId: user.id, scope: 'category', categoryId }),
  ])

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'Category'

  const undoId = searchParams?.undo

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{categoryName}</h1>
        <NewResourceDialog defaultCategoryId={categoryId} />
      </div>

      {undoId ? <UndoBanner resourceId={undoId} /> : null}
      <ResourceList resources={resources} />
    </div>
  )
}
