import { ScrollYFade } from '@/components/ui/scroll-y-fade'
import { Separator } from '@/components/ui/separator'
import { requireServerUser } from '@/lib/supabase/auth'
import { listTasks } from '@/lib/db/tasks'
import { CommandCenterClient } from '@/features/command-center/components/command-center-client'
import { PageViewTracker } from '@/features/instrumentation/components/page-view-tracker'
import { z } from 'zod'

type WorkflowHomePageProps = {
  params: Promise<{ workflowId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

export default async function WorkflowHomePage({ params, searchParams }: WorkflowHomePageProps) {
  const user = await requireServerUser()
  const { workflowId } = await params

  const sp = (await searchParams) ?? {}
  const focusTaskIdRaw = firstString(sp.focusTaskId)
  const focusTaskId = focusTaskIdRaw && z.string().uuid().safeParse(focusTaskIdRaw).success ? focusTaskIdRaw : undefined

  const [openTasks, doneTasks] = await Promise.all([
    listTasks({ userId: user.id, workflowId, scope: 'open' }),
    listTasks({ userId: user.id, workflowId, scope: 'done' }),
  ])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <div className="relative flex-1 min-h-0">
        <ScrollYFade className="h-full" viewportClassName="pr-4 pb-16">
          <div className="pt-4 pb-4">
            <PageViewTracker workflowId={workflowId} name="view_dashboard" />
            <CommandCenterClient
              workflowId={workflowId}
              openTasks={openTasks}
              doneTasks={doneTasks}
              initialFocusTaskId={focusTaskId}
            />
          </div>
        </ScrollYFade>
      </div>
    </div>
  )
}
