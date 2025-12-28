'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Circle, ExternalLink, GripVertical, Link2 } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { TaskActionsDialog } from '@/features/tasks/components/task-actions-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getFaviconProxyUrl, getFaviconProxyUrlFromIconUrl } from '@/lib/url'
import { Spinner } from '@/components/ui/spinner'

function priorityBadgeClass(priority: Task['priority']) {
  switch (priority) {
    case 'high':
      // Keep priority legible without turning the column into a solid "stripe".
      return 'bg-transparent text-destructive ring-1 ring-inset ring-destructive/30'
    case 'medium':
      // Medium should not feel like a warning.
      return 'bg-transparent text-foreground/70 ring-1 ring-inset ring-border/50'
    case 'low':
      return 'bg-transparent text-muted-foreground ring-1 ring-inset ring-border/40'
  }
}

function getDueMeta(dueAt: string | null) {
  if (!dueAt) return null
  const t = Date.parse(dueAt)
  if (!Number.isFinite(t)) return null
  const d = new Date(t)
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const isPast = startDue.getTime() < startToday.getTime()

  return { label, isPast }
}

function TaskTag({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        // Avoid forcing horizontal overflow inside tight layouts (Dashboard has a right column).
        // Let tags shrink if needed; truncation is handled by the surrounding containers.
        'inline-flex min-w-0 max-w-full shrink items-center rounded-md px-2.5 py-1 text-xs font-medium leading-none truncate',
        // Light mode: slightly stronger fill for legibility on “paper” background; keep dark mode unchanged.
        'bg-muted/55 text-muted-foreground dark:bg-muted/40',
        className
      )}
    >
      {children}
    </span>
  )
}

function TaskStatusButton({
  task,
  refreshOnSuccess = true,
  onLocalStatusChange,
}: {
  task: Task
  refreshOnSuccess?: boolean
  onLocalStatusChange?: (taskId: string, nextStatus: Task['status']) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const nextStatus = task.status === 'done' ? 'open' : 'done'
  const ariaLabel = task.status === 'done' ? 'Mark as not done' : 'Mark as done'

  const handleClick = useCallback(async () => {
    if (pending) return
    const prev = task.status
    const next = nextStatus

    setPending(true)
    onLocalStatusChange?.(task.id, next)

    try {
      const res = await fetch('/api/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, nextStatus: next }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null
      if (!res.ok || !json?.ok) {
        onLocalStatusChange?.(task.id, prev)
        toast(json?.message || 'Couldn’t update. Try again.')
        return
      }

      if (refreshOnSuccess) router.refresh()
    } catch {
      onLocalStatusChange?.(task.id, prev)
      toast('Couldn’t update. Try again.')
    } finally {
      setPending(false)
    }
  }, [nextStatus, onLocalStatusChange, pending, refreshOnSuccess, router, task.id, task.status])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="h-9 w-9"
      aria-label={ariaLabel}
      disabled={pending}
      aria-disabled={pending}
      onClick={handleClick}
    >
      {pending ? (
        <Spinner aria-hidden="true" className="size-4" />
      ) : task.status === 'done' ? (
        <CheckCircle2 aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Circle aria-hidden="true" className="text-muted-foreground" />
      )}
      <span className="sr-only">{ariaLabel}</span>
    </Button>
  )
}

export function TaskRow({
  task,
  dragHandleProps,
  refreshOnToggle,
  onLocalStatusChange,
  showDragHandlePlaceholder,
  hideDueDate = false,
}: {
  task: Task
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  refreshOnToggle?: boolean
  onLocalStatusChange?: (taskId: string, nextStatus: Task['status']) => void
  showDragHandlePlaceholder?: boolean
  /** Hide due date badge (e.g. in Today section where it's redundant) */
  hideDueDate?: boolean
}) {
  const due = useMemo(() => getDueMeta(task.due_at), [task.due_at])
  const primary = task.title?.trim() ? task.title : 'Untitled task'
  const dueIsOverdue = Boolean(due?.isPast) && task.status === 'open'
  const description = (task.description ?? '').trim()
  const showDescriptionTooltip = description.length > 80 || description.includes('\n')
  const primaryAppUrl = (task.primary_url ?? '').trim()
  const primaryResource = task.primary_resource ?? null

  const appHref = (primaryResource?.url ?? '').trim() || primaryAppUrl
  const appLabel = useMemo(() => {
    const t = primaryResource?.title?.trim()
    if (t) return t
    if (primaryResource?.url?.trim()) return primaryResource.url
    return 'App'
  }, [primaryResource])

  const appIconSrc = useMemo(() => {
    const icon = primaryResource?.favicon_url?.trim()
    if (icon) return getFaviconProxyUrlFromIconUrl(icon)
    if (primaryResource?.url?.trim()) return getFaviconProxyUrl(primaryResource.url)
    if (appHref) return getFaviconProxyUrl(appHref)
    return null
  }, [appHref, primaryResource])

  return (
    <div
      className={cn(
        // List row styling: low noise, separators come from the parent "divide-y".
        // Guard against horizontal overflow pushing adjacent dashboard columns (e.g. Calendar) off-screen.
        // Fixed height prevents subtle layout shifts during hydration / font settling / DnD init.
        'flex min-h-[60px] min-w-0 items-center gap-2 overflow-x-hidden bg-transparent px-2 py-2 transition-colors',
        'hover:bg-muted/30 focus-within:bg-muted/20',
        task.status === 'done' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : ''
      )}
    >
      {dragHandleProps ? (
        <button
          type="button"
          aria-label="Reorder task"
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...dragHandleProps}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      ) : showDragHandlePlaceholder ? (
        // Keep alignment stable while drag-and-drop hydrates (placeholder matches handle size).
        <div aria-hidden="true" className="h-9 w-9" />
      ) : null}

      <TaskStatusButton task={task} refreshOnSuccess={refreshOnToggle} onLocalStatusChange={onLocalStatusChange} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              'min-w-0 truncate text-sm font-medium leading-5',
              task.status === 'done' ? 'line-through text-muted-foreground' : ''
            )}
          >
            {primary}
          </p>
        </div>

        {description ? (
          showDescriptionTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="mt-0.5 block w-full truncate text-left text-xs leading-4 text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
                  aria-label="Task description (truncated). Focus to preview."
                >
                  {description}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="start"
                sideOffset={8}
                className="max-w-[min(560px,calc(100vw-2rem))] whitespace-pre-wrap wrap-break-word"
              >
                {description}
              </TooltipContent>
            </Tooltip>
          ) : (
            <p className="mt-0.5 truncate text-xs leading-4 text-foreground/60" title={description}>
              {description}
            </p>
          )
        ) : null}
      </div>

      {/* Right-side metadata: calm, tinted tags. */}
      <div className="ml-auto flex min-w-0 max-w-[55%] items-center justify-end gap-2 overflow-hidden pl-1">
        <TaskTag className={priorityBadgeClass(task.priority)}>
          {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
        </TaskTag>

        {due && !hideDueDate ? (
          <TaskTag
            className={cn(dueIsOverdue ? 'bg-destructive/15 text-destructive' : 'bg-muted/40 text-muted-foreground')}
          >
            Due {due.label}
          </TaskTag>
        ) : null}

        {appHref ? (
          <Link
            href={appHref}
            target="_blank"
            rel="noopener noreferrer"
            title={appLabel}
            className={cn(
              // Fixed height + centered contents keeps icon/text visually centered and consistent across rows.
              'group inline-flex h-7 min-w-0 max-w-[220px] items-center gap-2 rounded-md px-2.5 text-xs font-medium',
              'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
            )}
          >
            {appIconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appIconSrc} alt="" className="size-3.5 shrink-0 rounded-sm" referrerPolicy="no-referrer" />
            ) : null}
            <span className="min-w-0 truncate">{primaryResource ? appLabel : 'App'}</span>
            <span className="hidden items-center group-hover:inline-flex group-focus-visible:inline-flex">
              <ExternalLink
                aria-hidden="true"
                className="size-3 text-muted-foreground/80 group-hover:text-foreground/90"
              />
            </span>
          </Link>
        ) : null}

        {task.url ? (
          <Link
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex h-7 items-center gap-2 rounded-md px-2.5 text-xs font-medium',
              'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
            )}
          >
            <Link2 aria-hidden="true" className="size-3 text-muted-foreground/80" />
            Link
          </Link>
        ) : null}

        <TaskActionsDialog task={task} triggerSize="icon-xs" />
      </div>
    </div>
  )
}
