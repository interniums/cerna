import { AppSidebar } from '@/components/app/app-sidebar'
import { EssentialsDock } from '@/components/app/essentials-dock'
import { WorkflowShellClient } from '@/components/app/workflow-shell-client'
import { UndoToast } from '@/features/resources/components/undo-toast'
import { requireServerUser } from '@/lib/supabase/auth'
import { getWorkflowById } from '@/lib/db/workflows'
import { getDefaultWorkflowId } from '@/lib/db/workflows'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const SIDEBAR_COOKIE_KEY = 'cerna-sidebar-collapsed'

type WorkflowLayoutProps = {
  children: React.ReactNode
  params: Promise<{ workflowId: string }>
}

export default async function WorkflowScopedLayout({ children, params }: WorkflowLayoutProps) {
  const user = await requireServerUser()
  const { workflowId } = await params
  const workflow =
    (await getWorkflowById({ userId: user.id, workflowId }).catch(() => null)) ??
    (await (async () => {
      const fallbackId = await getDefaultWorkflowId({ userId: user.id })
      redirect(`/app/w/${fallbackId}`)
    })())

  // Next.js 16 `cookies()` is async in RSC/Turbopack.
  const cookieStore = await cookies()
  const initialSidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE_KEY)?.value === 'true'

  return (
    <WorkflowShellClient
      workflowTheme={workflow.theme}
      initialSidebarCollapsed={initialSidebarCollapsed}
      sidebar={<AppSidebar userId={user.id} workflowId={workflowId} />}
      header={<EssentialsDock userId={user.id} workflowId={workflowId} />}
      afterHeader={<UndoToast />}
    >
      {children}
    </WorkflowShellClient>
  )
}
