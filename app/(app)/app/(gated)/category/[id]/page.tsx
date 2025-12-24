import { redirect } from 'next/navigation'

import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { listCategories } from '@/lib/db/categories'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'
import { UndoBanner } from '@/features/resources/components/undo-banner'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'
import { EditCategoryDialog } from '@/features/categories/components/edit-category-dialog'
import { Separator } from '@/components/ui/separator'

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
  const pinned = resources.filter((r) => r.is_pinned)
  const other = resources.filter((r) => !r.is_pinned)

  const category = categories.find((c) => c.id === categoryId)
  if (!category) redirect('/app')

  const sp = (await searchParams) ?? {}
  const undoId = sp.undo

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <div className="flex items-center gap-2">
          <EditCategoryDialog categoryId={categoryId} initialName={category.name} />
          <NewResourceDialog defaultCategoryId={categoryId} trigger="icon" />
        </div>
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <ScrollYFade className="flex-1" viewportClassName="pr-4">
        <div className="pt-4 pb-4">
          {undoId ? (
            <div className="pb-4">
              <UndoBanner resourceId={undoId} />
            </div>
          ) : null}
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
