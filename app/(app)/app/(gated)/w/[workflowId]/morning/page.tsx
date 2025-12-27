import { Separator } from '@/components/ui/separator'
import { requireServerUser } from '@/lib/supabase/auth'
import { listMorningBriefingTasks } from '@/lib/db/tasks'
import { listResources } from '@/lib/db/resources'
import { MorningBriefing } from '@/features/briefing/components/morning-briefing'
import { PageViewTracker } from '@/features/instrumentation/components/page-view-tracker'

type MorningBriefingPageProps = {
  params: Promise<{ workflowId: string }>
}

export default async function MorningBriefingPage({ params }: MorningBriefingPageProps) {
  const user = await requireServerUser()
  const { workflowId } = await params

  const [{ overdue, today, noDue }, pinned, recent] = await Promise.all([
    listMorningBriefingTasks({ userId: user.id, workflowId }),
    listResources({ userId: user.id, workflowId, scope: 'pinned', limit: 6 }),
    listResources({ userId: user.id, workflowId, scope: 'all', mode: 'recent', limit: 6 }),
  ])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Morning briefing</h1>
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <div className="pr-4 pt-4 pb-6">
        <PageViewTracker workflowId={workflowId} name="view_morning" />
        <MorningBriefing workflowId={workflowId} overdue={overdue} today={today} noDue={noDue} pinned={pinned} recent={recent} />
      </div>
    </div>
  )
}


