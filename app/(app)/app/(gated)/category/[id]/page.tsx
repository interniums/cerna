import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { UndoBanner } from '@/features/resources/components/undo-banner'

type CategoryPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ undo?: string }>
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const user = await requireServerUser()
  const { id: categoryId } = await params

  const [categories, resources] = await Promise.all([
    listCategories(user.id),
    listResources({ userId: user.id, scope: 'category', categoryId }),
  ])

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'Category'

  const sp = (await searchParams) ?? {}
  const undoId = sp.undo

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
