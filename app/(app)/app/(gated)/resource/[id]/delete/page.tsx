import Link from 'next/link'

import { confirmDeleteResourceAction } from '@/app/(app)/app/(gated)/resource/[id]/delete/actions'
import { getResourceById } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type DeletePageProps = {
  params: { id: string }
  searchParams?: { returnTo?: string }
}

export default async function DeleteResourcePage({ params, searchParams }: DeletePageProps) {
  const user = await requireServerUser()
  const { id } = params
  const { returnTo } = searchParams ?? {}

  const resource = await getResourceById({ userId: user.id, resourceId: id })

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Delete resource</h1>
      <Card className="grid gap-3 p-6">
        <p className="text-sm text-muted-foreground">
          This will remove the resource from your lists. You can undo right after.
        </p>
        <div className="rounded-md border border-border/60 p-3">
          <p className="truncate text-sm font-medium">{resource.title ?? resource.url}</p>
          <p className="truncate text-xs text-muted-foreground">{resource.url}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={confirmDeleteResourceAction.bind(null, id, returnTo ?? '/app/all')} className="sm:max-w-xs">
            <Button className="w-full" variant="destructive">
              Delete
            </Button>
          </form>
          <Button asChild className="sm:max-w-xs" variant="secondary">
            <Link href={returnTo ?? '/app/all'}>Cancel</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
