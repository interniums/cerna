import Link from 'next/link'

import type { Resource } from '@/lib/db/resources'
import {
  archiveResourceAction,
  toggleFavoriteAction,
  togglePinnedAction,
  unarchiveResourceAction,
} from '@/features/resources/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function getPrimaryText(resource: Resource) {
  return resource.title?.trim() ? resource.title : resource.url
}

function getOutHref(resourceId: string) {
  return `/app/out/${resourceId}`
}

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-3">
      {resources.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={getOutHref(r.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium text-foreground hover:underline"
                >
                  {getPrimaryText(r)}
                </Link>
                {r.is_pinned ? <Badge variant="secondary">Pinned</Badge> : null}
                {r.status === 'archived' ? <Badge variant="outline">Archived</Badge> : null}
              </div>
              {r.notes ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.notes}</p> : null}
              <p className="mt-1 truncate text-xs text-muted-foreground">{r.url}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <form action={togglePinnedAction.bind(null, r.id)}>
                <Button size="sm" variant="secondary">
                  {r.is_pinned ? 'Unpin' : 'Pin'}
                </Button>
              </form>
              <form action={toggleFavoriteAction.bind(null, r.id)}>
                <Button size="sm" variant="secondary">
                  {r.is_favorite ? 'Unfavorite' : 'Favorite'}
                </Button>
              </form>
              {r.status === 'archived' ? (
                <form action={unarchiveResourceAction.bind(null, r.id)}>
                  <Button size="sm" variant="secondary">
                    Unarchive
                  </Button>
                </form>
              ) : (
                <form action={archiveResourceAction.bind(null, r.id)}>
                  <Button size="sm" variant="secondary">
                    Archive
                  </Button>
                </form>
              )}
              <Button asChild size="sm" variant="ghost">
                <Link href={`/app/resource/${r.id}/delete`}>Delete…</Link>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
