import { listCategories } from '@/lib/db/categories'
import { AppNavLink } from '@/components/app/app-nav-link'
import { NewCategoryDialog } from '@/components/app/new-category-dialog'
import { Separator } from '@/components/ui/separator'
import { CategoryNavItem } from '@/features/categories/components/category-nav-item'
import { listWorkflows } from '@/lib/db/workflows'
import { WorkflowSwitcher } from '@/components/app/workflow-switcher'

type AppSidebarProps = {
  userId: string
  workflowId: string
}

export async function AppSidebar({ userId, workflowId }: AppSidebarProps) {
  const workflows = await listWorkflows(userId)
  const categories = await listCategories({ userId, workflowId })

  return (
    <aside className="w-full sm:w-60">
      <div className="mb-4">
        <WorkflowSwitcher workflows={workflows} activeWorkflowId={workflowId} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Library</p>
      </div>

      <div className="mt-3 grid gap-1">
        <AppNavLink href={`/app/w/${workflowId}`}>Dashboard</AppNavLink>
        <AppNavLink href={`/app/w/${workflowId}/morning`}>Morning</AppNavLink>
        <AppNavLink href={`/app/w/${workflowId}/command-center`}>Command Center</AppNavLink>
        <AppNavLink href={`/app/w/${workflowId}/pinned`}>Pinned</AppNavLink>
        <AppNavLink href={`/app/w/${workflowId}/all`}>All</AppNavLink>
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</p>
        <NewCategoryDialog workflowId={workflowId} />
      </div>
      <div className="mt-3 grid gap-1">
        {categories.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No sections yet.</p>
        ) : (
          categories.map((c) => <CategoryNavItem key={c.id} workflowId={workflowId} id={c.id} name={c.name} />)
        )}
      </div>
    </aside>
  )
}
