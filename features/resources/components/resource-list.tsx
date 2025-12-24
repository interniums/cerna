import Link from 'next/link'
import { Pin, PinOff, Star, StarOff, Trash2 } from 'lucide-react'
import { Link2 } from 'lucide-react'

import type { Resource } from '@/lib/db/resources'
import { toggleFavoriteAction, togglePinnedAction } from '@/features/resources/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
        <Card
          key={r.id}
          className="cerna-hover-card group relative max-w-full min-w-0 cursor-pointer p-4 motion-reduce:transition-none"
        >
          {/* Full-card link (buttons remain clickable via higher z-index). */}
          <Link
            href={getOutHref(r.id)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${getPrimaryText(r)}`}
            className="cerna-hover-card absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <div className="flex max-w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : r.favicon_url ? (
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

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{getPrimaryText(r)}</span>
                  {r.is_pinned ? (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[11px] border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
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

            <div className="relative z-20 flex w-full max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto py-0.5 sm:w-auto sm:justify-end">
              <form action={togglePinnedAction.bind(null, r.id)} className="shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="cerna-hover-control"
                      aria-label={r.is_pinned ? 'Unpin resource' : 'Pin resource'}
                    >
                      {r.is_pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{r.is_pinned ? 'Unpin' : 'Pin'}</TooltipContent>
                </Tooltip>
              </form>
              <form action={toggleFavoriteAction.bind(null, r.id)} className="shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="cerna-hover-control"
                      aria-label={r.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {r.is_favorite ? <StarOff aria-hidden="true" /> : <Star aria-hidden="true" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{r.is_favorite ? 'Unfavorite' : 'Favorite'}</TooltipContent>
                </Tooltip>
              </form>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    size="icon-xs"
                    variant="ghost"
                    className="cerna-hover-control shrink-0"
                    aria-label="Delete resource"
                  >
                    <Link href={`/app/resource/${r.id}/delete`}>
                      <Trash2 aria-hidden="true" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Delete</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
