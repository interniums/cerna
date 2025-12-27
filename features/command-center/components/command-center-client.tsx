'use client'

import { useCallback, useMemo, useState } from 'react'

import type { Task } from '@/lib/db/tasks'
import { TaskList } from '@/features/tasks/components/task-list'
import type { TaskTab } from '@/features/tasks/task-tab-persistence'
import { FocusModeCard } from '@/features/focus/components/focus-mode-card'
import { CalendarWidget } from '@/features/calendar/components/calendar-widget'
import { Button } from '@/components/ui/button'

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
  initialFocusTaskId,
  tasksLoadError,
}: CommandCenterClientProps) {
  const [focusActive, setFocusActive] = useState(false)
  const [showAllWhileFocusing, setShowAllWhileFocusing] = useState(false)

  const handleFocusActiveChange = useCallback((active: boolean) => {
    setFocusActive(active)
    if (!active) setShowAllWhileFocusing(false)
  }, [])

  const handleToggleShowAll = useCallback(() => {
    setShowAllWhileFocusing((v) => !v)
  }, [])

  const tasksForFocus = useMemo(() => openTasks, [openTasks])
  const hideNonEssential = focusActive && !showAllWhileFocusing

  return (
    <div className="grid gap-6">
      {focusActive ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">Focus mode is on.</p>
          <Button type="button" variant="secondary" onClick={handleToggleShowAll}>
            {showAllWhileFocusing ? 'Hide extras' : 'Show everything'}
          </Button>
        </div>
      ) : null}

      {/* Don't let the tallest column stretch the others (prevents Tasks height changing when Calendar grows). */}
      <div className="grid items-start gap-8 lg:grid-cols-3">
        <div className={hideNonEssential ? 'min-w-0 lg:col-span-3' : 'min-w-0 lg:col-span-2'}>
          <div className="grid gap-6">
            {hideNonEssential ? null : tasksLoadError ? (
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

            <FocusModeCard
              workflowId={workflowId}
              tasks={tasksForFocus}
              initialTaskId={initialFocusTaskId}
              onActiveChange={handleFocusActiveChange}
            />
          </div>
        </div>

        {hideNonEssential ? null : (
          <div className="grid min-w-0 gap-6">
            <CalendarWidget workflowId={workflowId} />
          </div>
        )}
      </div>
    </div>
  )
}


