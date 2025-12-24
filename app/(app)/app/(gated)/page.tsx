import { NewResourceDialog } from '@/components/app/new-resource-dialog'
import { ScrollYFade } from '@/components/ui/scroll-y-fade'
import { Separator } from '@/components/ui/separator'
import { listResources } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { ResourceList } from '@/features/resources/components/resource-list'

export default async function AppHomePage() {
  const user = await requireServerUser()
  const [pinned, recent] = await Promise.all([
    listResources({ userId: user.id, scope: 'pinned', limit: 8 }),
    listResources({ userId: user.id, scope: 'all', limit: 8 }),
  ])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <NewResourceDialog trigger="icon" />
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <ScrollYFade className="flex-1" viewportClassName="pr-4">
        <div className="grid gap-6 pt-4 pb-4">
          <div className="grid gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Pinned</h2>
            <ResourceList resources={pinned} />
          </div>

          <Separator />

          <div className="grid gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Recent</h2>
            <ResourceList resources={recent} />
          </div>
        </div>
      </ScrollYFade>
    </div>
  )
}
