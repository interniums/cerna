import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function TaskRowSkeleton() {
  // Matches real TaskRow layout exactly: min-h-[60px], drag handle, status button, content, tags
  return (
    <div className="flex min-h-[60px] min-w-0 items-center gap-2 overflow-x-hidden bg-transparent px-2 py-2">
      {/* Drag handle placeholder */}
      <div className="h-9 w-9 shrink-0" />
      {/* Status button */}
      <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
      {/* Content */}
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-1 h-3 w-1/2" />
      </div>
      {/* Tags */}
      <div className="ml-auto flex min-w-0 max-w-[55%] items-center justify-end gap-2 overflow-hidden pl-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
    </div>
  )
}

function TasksCardSkeleton() {
  return (
    <Card className="flex h-[600px] flex-col gap-1.5 pt-2 pb-0">
      <CardHeader className="gap-1 pb-0 pt-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Tasks</CardTitle>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
        <div className="min-h-4" />
        <Separator className="mt-2" />
        <div className="-mt-2 grid flex-1 min-h-0 content-start gap-2 overflow-y-auto overflow-x-hidden pr-4 py-6 scrollbar-gutter-stable">
          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
            {Array.from({ length: 6 }).map((_, idx) => (
              // Wrapper div matches SortableTaskItem/StaticTaskItem structure
              <div key={idx}>
                <TaskRowSkeleton />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CalendarCardSkeleton() {
  // Matches real CalendarWidget structure exactly to prevent any layout shift.
  return (
    <Card className="min-w-0 pt-2">
      <CardHeader className="pb-3 pt-2 px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CardTitle className="text-sm truncate">Calendar</CardTitle>
            {/* Match the real widget's fixed refresh-icon slot so the title never reflows. */}
            <span className="inline-flex size-4 shrink-0" aria-hidden="true" />
          </div>
          <div className="shrink-0 size-8">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 min-h-[184px] min-w-0 px-4 sm:px-6">
        {/* Matches CalendarWidgetSkeleton / CalendarEventRow layout */}
        <div className="flex flex-col gap-1">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 rounded-md px-3 py-2">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {/* Time column */}
                <Skeleton className="w-14 sm:w-16 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {/* Event title */}
                  <Skeleton className="h-4 w-3/4" />
                  {/* Meta line */}
                  <div className="mt-1 flex items-center gap-2">
                    <Skeleton className="size-2.5 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
              {/* Actions slot: hidden on mobile */}
              <div className="hidden sm:flex shrink-0 items-center gap-1">
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
          {/* Footer */}
          <Skeleton className="h-3 w-36" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Loading() {
  return (
    <div className="flex min-w-0 flex-col overflow-x-hidden">
      <div className="flex flex-col gap-3 pb-4 lg:pr-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-52" />
      </div>

      <div className="lg:pr-4">
        <Separator />
      </div>

      <div className="min-w-0 pt-4 pb-6 lg:pr-4">
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <div className="grid gap-6">
              <TasksCardSkeleton />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          </div>

          <div className="grid min-w-0 gap-6">
            <CalendarCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}


