'use client'

import { useCallback, useMemo, useState } from 'react'

import type { Task } from '@/lib/db/tasks'
import { TaskCreateForm } from '@/features/tasks/components/task-create-form'
import { TaskList } from '@/features/tasks/components/task-list'
import { FocusModeCard } from '@/features/focus/components/focus-mode-card'
import { CalendarWidget } from '@/features/calendar/components/calendar-widget'
import { Button } from '@/components/ui/button'

type CommandCenterClientProps = {
  workflowId: string
  openTasks: Task[]
  doneTasks: Task[]
  initialFocusTaskId?: string
}

export function CommandCenterClient({ workflowId, openTasks, doneTasks, initialFocusTaskId }: CommandCenterClientProps) {
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={hideNonEssential ? 'lg:col-span-3' : 'lg:col-span-2'}>
          <div className="grid gap-6">
            <FocusModeCard
              workflowId={workflowId}
              tasks={tasksForFocus}
              initialTaskId={initialFocusTaskId}
              onActiveChange={handleFocusActiveChange}
            />

            {hideNonEssential ? null : <TaskCreateForm workflowId={workflowId} />}
            {hideNonEssential ? null : <TaskList openTasks={openTasks} doneTasks={doneTasks} />}
          </div>
        </div>

        {hideNonEssential ? null : (
          <div className="grid gap-6">
            <CalendarWidget workflowId={workflowId} />
          </div>
        )}
      </div>
    </div>
  )
}


