import { listCategories } from '@/lib/db/categories'
import { listWorkflows } from '@/lib/db/workflows'
import { AppSidebarClient } from '@/components/app/app-sidebar-client'

type AppSidebarProps = {
  userId: string
  workflowId: string
}

export async function AppSidebar({ userId, workflowId }: AppSidebarProps) {
  const workflows = await listWorkflows(userId)
  const categories = await listCategories({ userId, workflowId })

  const navItems = [
    { href: `/app/w/${workflowId}`, label: 'Dashboard', iconName: 'dashboard' as const },
    { href: `/app/w/${workflowId}/morning`, label: 'Morning', iconName: 'morning' as const },
    { href: `/app/w/${workflowId}/inbox`, label: 'Inbox', iconName: 'inbox' as const },
    { href: `/app/w/${workflowId}/notes`, label: 'Notes', iconName: 'notes' as const },
    { href: `/app/w/${workflowId}/resources`, label: 'Resources', iconName: 'resources' as const },
  ]

  const categoryItems = categories.map((c) => ({
    id: c.id,
    href: `/app/w/${workflowId}/category/${c.id}`,
    name: c.name,
  }))

  return (
    <AppSidebarClient
      workflows={workflows}
      activeWorkflowId={workflowId}
      navItems={navItems}
      categoryItems={categoryItems}
      workflowId={workflowId}
    />
  )
}
