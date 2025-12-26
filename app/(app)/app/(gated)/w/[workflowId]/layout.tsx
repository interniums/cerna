import { AppSidebar } from '@/components/app/app-sidebar'
import { EssentialsDock } from '@/components/app/essentials-dock'
import { UndoToast } from '@/features/resources/components/undo-toast'
import { requireServerUser } from '@/lib/supabase/auth'
import { getWorkflowById } from '@/lib/db/workflows'
import { getDefaultWorkflowId } from '@/lib/db/workflows'
import { redirect } from 'next/navigation'

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

  return (
    <div
      className="grid h-full min-h-0 gap-8 px-4 sm:grid-cols-[15rem_minmax(0,1fr)] sm:px-6"
      data-workflow-theme={workflow.theme}
    >
      <AppSidebar userId={user.id} workflowId={workflowId} />
      <div className="flex h-full min-h-0 flex-col py-6">
        <div className="mb-6 pr-4">
          <EssentialsDock userId={user.id} workflowId={workflowId} />
        </div>
        <UndoToast />
        {children}
      </div>
    </div>
  )
}


