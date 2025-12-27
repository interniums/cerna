import Link from 'next/link'

import type { Task } from '@/lib/db/tasks'
import type { Resource } from '@/lib/db/resources'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarWidget } from '@/features/calendar/components/calendar-widget'
import { TaskRow } from '@/features/tasks/components/task-row'
import { ResourceList } from '@/features/resources/components/resource-list'

type MorningBriefingProps = {
  workflowId: string
  overdue: Task[]
  today: Task[]
  noDue: Task[]
  pinned: Resource[]
  recent: Resource[]
}

export function MorningBriefing({ workflowId, overdue, today, noDue, pinned, recent }: MorningBriefingProps) {
  const hasTasks = overdue.length > 0 || today.length > 0 || noDue.length > 0
  const suggested = overdue[0] ?? today[0] ?? noDue[0] ?? null

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">Here’s what matters right now.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild type="button" variant="secondary">
            <Link href={`/app/w/${workflowId}`}>Open Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Suggested first focus</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {suggested ? (
                <>
                  <p className="text-sm">
                    Do a <span className="font-medium">25-minute</span> focus block on:
                  </p>
                  <p className="text-sm font-medium truncate">{suggested.title}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button asChild type="button" variant="secondary">
                      <Link href={`/app/w/${workflowId}?focusTaskId=${encodeURIComponent(suggested.id)}`}>
                        Start focus
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Add a task to get a focus suggestion.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Today</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!hasTasks ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}

              {overdue.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue</p>
                  <div className="grid gap-2">
                    {overdue.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              ) : null}

              {today.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due today</p>
                  <div className="grid gap-2">
                    {today.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              ) : null}

              {noDue.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">No due date</p>
                  <div className="grid gap-2">
                    {noDue.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pinned</CardTitle>
            </CardHeader>
            <CardContent>
              <ResourceList resources={pinned} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent</CardTitle>
            </CardHeader>
            <CardContent>
              <ResourceList resources={recent} />
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 gap-6">
          <CalendarWidget workflowId={workflowId} />
        </div>
      </div>
    </div>
  )
}


