'use client'

import type { Task } from '@/lib/db/tasks'
import { TaskList } from '@/features/tasks/components/task-list'
import type { TaskTab } from '@/features/tasks/task-tab-persistence'
import { CalendarWidget } from '@/features/calendar/components/calendar-widget'

type CommandCenterClientProps = {
  workflowId: string
  openTasks: Task[]
  doneTasks: Task[]
  todayUtcYmd: string
  initialTaskTab?: TaskTab
  initialFocusTaskId?: string
  tasksLoadError?: string | null
}

export function CommandCenterClient({
  workflowId,
  openTasks,
  doneTasks,
  todayUtcYmd,
  initialTaskTab,
  tasksLoadError,
}: CommandCenterClientProps) {
  return (
    <div className="grid gap-6">
      {/* Don't let the tallest column stretch the others (prevents Tasks height changing when Calendar grows). */}
      <div className="grid items-start gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="grid gap-6">
            {tasksLoadError ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-medium">Tasks aren’t available</p>
                <p className="mt-1 text-sm text-muted-foreground">{tasksLoadError}</p>
              </div>
            ) : (
              <TaskList
                workflowId={workflowId}
                openTasks={openTasks}
                doneTasks={doneTasks}
                todayUtcYmd={todayUtcYmd}
                initialActiveTab={initialTaskTab}
              />
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-6">
          <CalendarWidget workflowId={workflowId} />
        </div>
      </div>
    </div>
  )
}


