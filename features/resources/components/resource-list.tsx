import Link from 'next/link'
import { Star } from 'lucide-react'
import { Link2 } from 'lucide-react'

import type { Resource } from '@/lib/db/resources'
import { toggleEssentialAction } from '@/features/resources/actions'
import { ResourceActionsDialog } from '@/features/resources/components/resource-actions-dialog'
import { Badge } from '@/components/ui/badge'
import { FormSubmitIconButton } from '@/components/forms/form-submit-icon-button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function getPrimaryText(resource: Resource) {
  return resource.title?.trim() ? resource.title : resource.url
}

function getOutHref(resourceId: string) {
  return `/app/out/${resourceId}`
}

function getHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0] || rawUrl
  }
}

function getFaviconServiceUrl(rawUrl: string) {
  const host = getHost(rawUrl)
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`
}

function getShortUrl(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    const host = u.hostname.replace(/^www\./, '')
    return host
  } catch {
    // If it's not a valid URL for some reason, fall back to a readable truncation.
    const cleaned = rawUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0] ?? rawUrl
    return cleaned.length > 48 ? `${cleaned.slice(0, 47)}…` : cleaned
  }
}

function ResourceRow({ r }: { r: Resource }) {
  const essentialLabel = r.is_essential ? 'Remove from essentials' : 'Add to essentials'

  return (
    <Card className="cerna-hover-card group max-w-full min-w-0 p-0 motion-reduce:transition-none">
      <div className="flex max-w-full min-w-0 items-stretch gap-0">
        <Link
          href={getOutHref(r.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${getPrimaryText(r)}`}
          className="cerna-hover-card min-w-0 flex-1 rounded-l-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {/* Icons: prefer favicon over OG/image tiles for consistency. */}
              {r.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.favicon_url} alt="" className="size-5" loading="lazy" referrerPolicy="no-referrer" />
              ) : r.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getFaviconServiceUrl(r.url)}
                  alt=""
                  className="size-5"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{getPrimaryText(r)}</span>
                {r.is_pinned ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    Pinned
                  </Badge>
                ) : null}
              </div>
              {r.notes ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.notes}</p> : null}
              <p className="mt-1 truncate text-xs text-muted-foreground" title={r.url}>
                {getShortUrl(r.url)}
              </p>
            </div>
          </div>
        </Link>

        {/* Control rail (separate from the link). */}
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-r-xl border-l border-border/60 px-2 py-2">
          <form action={toggleEssentialAction.bind(null, r.id)} className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <FormSubmitIconButton
                  size="icon-xs"
                  variant="ghost"
                  className="cerna-hover-control"
                  aria-label={essentialLabel}
                  pendingLabel={essentialLabel}
                  idleIcon={
                    r.is_essential ? (
                      <Star aria-hidden="true" className="text-yellow-500" fill="currentColor" />
                    ) : (
                      <Star aria-hidden="true" />
                    )
                  }
                />
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                {r.is_essential ? 'Remove from essentials' : 'Add to essentials'}
              </TooltipContent>
            </Tooltip>
          </form>

          <ResourceActionsDialog resource={r} />
        </div>
      </div>
    </Card>
  )
}

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <Card className="max-w-full min-w-0 p-6">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </Card>
    )
  }

  return (
    <div className="grid max-w-full min-w-0 gap-3">
      {resources.map((r) => (
        <ResourceRow key={r.id} r={r} />
      ))}
    </div>
  )
}
