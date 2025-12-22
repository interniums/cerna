import { listCategories } from '@/lib/db/categories'
import { AppNavLink } from '@/components/app/app-nav-link'
import { NewCategoryDialog } from '@/components/app/new-category-dialog'
import { Separator } from '@/components/ui/separator'
import { CategoryNavItem } from '@/features/categories/components/category-nav-item'

type AppSidebarProps = {
  userId: string
}

export async function AppSidebar({ userId }: AppSidebarProps) {
  const categories = await listCategories(userId)

  return (
    <aside className="w-full sm:w-60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Library</p>
        <NewCategoryDialog />
      </div>

      <div className="mt-3 grid gap-1">
        <AppNavLink href="/app">Dashboard</AppNavLink>
        <AppNavLink href="/app/search">Search</AppNavLink>
        <AppNavLink href="/app/pinned">Pinned</AppNavLink>
        <AppNavLink href="/app/all">All</AppNavLink>
        <AppNavLink href="/app/archive">Archive</AppNavLink>
      </div>

      <Separator className="my-4" />

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categories</p>
      <div className="mt-3 grid gap-1">
        {categories.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <CategoryNavItem key={c.id} id={c.id} name={c.name} />
          ))
        )}
      </div>
    </aside>
  )
}
