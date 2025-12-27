'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import type { Task } from '@/lib/db/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskRow } from '@/features/tasks/components/task-row'
import { TaskCreateDialog } from '@/features/tasks/components/task-create-dialog'
import { reorderTasksAction } from '@/features/tasks/actions'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { TASKS_ACTIVE_TAB_COOKIE_MAX_AGE_SECONDS, getTasksActiveTabKey, isTaskTab, type TaskTab } from '@/features/tasks/task-tab-persistence'

function setTasksActiveTabCookie(workflowId: string, tab: TaskTab) {
  try {
    document.cookie = `${getTasksActiveTabKey(workflowId)}=${tab}; Path=/; Max-Age=${TASKS_ACTIVE_TAB_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  } catch {
    // Ignore cookie errors.
  }
}

function ymdFromIsoUtc(iso: string | null) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  // Use UTC date component (matches how we store due_at: midday UTC).
  return new Date(t).toISOString().slice(0, 10)
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function isDueTodayOrPastUtc(task: Task, todayUtcYmd: string) {
  if (!task.due_at) return false
  const dueYmd = ymdFromIsoUtc(task.due_at)
  if (!dueYmd) return false
  // yyyy-mm-dd lexical compare works.
  return dueYmd <= todayUtcYmd
}

function bucketOpenTasksUtc(openTasks: Task[], todayUtcYmd: string) {
  const today: Task[] = []
  const other: Task[] = []

  for (const t of openTasks) {
    if (isDueTodayOrPastUtc(t, todayUtcYmd)) today.push(t)
    else other.push(t)
  }

  return { today, other }
}

function SortableTaskItem({
  task,
  onLocalStatusChange,
  hideDueDate = false,
}: {
  task: Task
  onLocalStatusChange: (taskId: string, nextStatus: Task['status']) => void
  hideDueDate?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: 'transform',
  }

  // dnd-kit listeners/attributes are safe to spread onto a button.
  const handleProps = { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'pointer-events-none relative z-10 opacity-80' : ''}>
      <TaskRow task={task} dragHandleProps={handleProps} refreshOnToggle={false} onLocalStatusChange={onLocalStatusChange} hideDueDate={hideDueDate} />
    </div>
  )
}

function StaticTaskItem({
  task,
  onLocalStatusChange,
  hideDueDate = false,
}: {
  task: Task
  onLocalStatusChange: (taskId: string, nextStatus: Task['status']) => void
  hideDueDate?: boolean
}) {
  // Wrap in identical structure to SortableTaskItem to prevent layout shift on hydration.
  // The wrapper div must exist and use the same layout (no transform/transition yet).
  return (
    <div>
      <TaskRow task={task} refreshOnToggle={false} onLocalStatusChange={onLocalStatusChange} showDragHandlePlaceholder hideDueDate={hideDueDate} />
    </div>
  )
}

export function TaskList({
  workflowId,
  openTasks,
  doneTasks,
  todayUtcYmd,
  initialActiveTab,
}: {
  workflowId: string
  openTasks: Task[]
  doneTasks: Task[]
  todayUtcYmd: string
  initialActiveTab?: TaskTab
}) {
  const router = useRouter()
  const hydrated = useHydrated()

  // Bucketing is UTC-stable because due_at is stored as midday UTC.
  const [todayTasks, setTodayTasks] = useState<Task[]>(() => bucketOpenTasksUtc(openTasks, todayUtcYmd).today)
  const [otherTasks, setOtherTasks] = useState<Task[]>(() => bucketOpenTasksUtc(openTasks, todayUtcYmd).other)
  const [done, setDoneTasks] = useState<Task[]>(() => doneTasks)

  const hasAny = openTasks.length > 0 || doneTasks.length > 0

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [activeTab, setActiveTab] = useState<TaskTab>(() => initialActiveTab ?? 'today')
  const [tabReady, setTabReady] = useState(() => Boolean(initialActiveTab))
  const [saving, setSaving] = useState<{ today: boolean; other: boolean; done: boolean }>({ today: false, other: false, done: false })

  const latestIdsRef = useRef<{ today: string[]; other: string[]; done: string[] }>({ today: [], other: [], done: [] })
  const inFlightRef = useRef<{ today: boolean; other: boolean; done: boolean }>({ today: false, other: false, done: false })
  const queuedRef = useRef<{ today: boolean; other: boolean; done: boolean }>({ today: false, other: false, done: false })
  const timerRef = useRef<{ today: number | null; other: number | null; done: number | null }>({ today: null, other: null, done: null })
  const requestIdRef = useRef<{ today: number; other: number; done: number }>({ today: 0, other: 0, done: 0 })

  const openKey = useMemo(() => openTasks.map((t) => t.id).join(','), [openTasks])
  const doneKey = useMemo(() => doneTasks.map((t) => t.id).join(','), [doneTasks])

  useEffect(() => {
    queueMicrotask(() => {
      const { today, other } = bucketOpenTasksUtc(openTasks, todayUtcYmd)
      setTodayTasks(today)
      setOtherTasks(other)
    })
  }, [openKey, openTasks, todayUtcYmd])

  useEffect(() => {
    queueMicrotask(() => setDoneTasks(doneTasks))
  }, [doneKey, doneTasks])

  const persistOrderIds = useCallback(
    async (tab: 'today' | 'other' | 'done') => {
      if (inFlightRef.current[tab]) {
        queuedRef.current[tab] = true
        return
      }

      const taskIds = latestIdsRef.current[tab]
      if (taskIds.length === 0) return

      inFlightRef.current[tab] = true
      setSaving((s) => ({ ...s, [tab]: true }))

      const requestId = ++requestIdRef.current[tab]
      try {
        const res = await reorderTasksAction({ workflowId, taskIds })
        if (!res.ok) {
          toast(res.message)
          console.error('[tasks] reorder returned error', { workflowId, taskIds, res })
          return
        }
        // Only refresh for the latest request for this tab.
        if (requestId === requestIdRef.current[tab]) router.refresh()
      } catch (error: unknown) {
        toast('Couldn’t reorder. Try again.')
        console.error('[tasks] reorder threw', { workflowId, taskIds, error })
      } finally {
        inFlightRef.current[tab] = false
        setSaving((s) => ({ ...s, [tab]: false }))
        if (queuedRef.current[tab]) {
          queuedRef.current[tab] = false
          void persistOrderIds(tab)
        }
      }
    },
    [router, workflowId]
  )

  const schedulePersistOrder = useCallback(
    (tab: 'today' | 'other' | 'done', tasks: Task[]) => {
      latestIdsRef.current[tab] = tasks.map((t) => t.id)
      const existing = timerRef.current[tab]
      if (existing) window.clearTimeout(existing)
      // Coalesce rapid reorder sequences into fewer saves.
      timerRef.current[tab] = window.setTimeout(() => {
        timerRef.current[tab] = null
        void persistOrderIds(tab)
      }, 1500)
    },
    [persistOrderIds]
  )

  const handleLocalStatusChange = useCallback(
    (taskId: string, nextStatus: Task['status']) => {
      setTodayTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
      setOtherTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
      setDoneTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
    },
    [setDoneTasks, setOtherTasks, setTodayTasks]
  )

  const reconcileBuckets = useCallback(() => {
    const nextTodayBase = todayTasks.filter((t) => t.status !== 'done')
    const nextOtherBase = otherTasks.filter((t) => t.status !== 'done')
    const nextDoneBase = done.filter((t) => t.status !== 'open')

    const doneIds = new Set(nextDoneBase.map((t) => t.id))
    const openIds = new Set([...nextTodayBase, ...nextOtherBase].map((t) => t.id))

    const doneFromOpen = [...todayTasks, ...otherTasks].filter((t) => t.status === 'done')
    const openFromDone = done.filter((t) => t.status === 'open')

    const nextDone = [...doneFromOpen.filter((t) => !doneIds.has(t.id)), ...nextDoneBase]
    const nextToday = [...nextTodayBase]
    const nextOther = [...nextOtherBase]

    for (const t of openFromDone) {
      if (openIds.has(t.id)) continue
      if (isDueTodayOrPastUtc(t, todayUtcYmd)) nextToday.unshift(t)
      else nextOther.unshift(t)
      openIds.add(t.id)
    }

    setTodayTasks(nextToday)
    setOtherTasks(nextOther)
    setDoneTasks(nextDone)
  }, [done, otherTasks, setDoneTasks, setOtherTasks, setTodayTasks, todayTasks, todayUtcYmd])

  const persistActiveTab = useCallback(
    (tab: TaskTab) => {
      if (!hydrated) return
      try {
        window.localStorage.setItem(getTasksActiveTabKey(workflowId), tab)
      } catch {
        // Ignore storage failures (private mode / quota / disabled).
      }
      setTasksActiveTabCookie(workflowId, tab)
    },
    [hydrated, workflowId]
  )

  // If the server didn't provide an initial tab (cookie missing), restore from localStorage
  // before showing any tab content to avoid the "Today flashes, then switches" effect.
  useLayoutEffect(() => {
    if (tabReady) return
    if (!hydrated) return

    try {
      const saved = window.localStorage.getItem(getTasksActiveTabKey(workflowId))
      if (isTaskTab(saved)) {
        setActiveTab(saved)
        setTasksActiveTabCookie(workflowId, saved) // migrate localStorage -> cookie
      }
    } catch {
      // Ignore storage failures.
    } finally {
      setTabReady(true)
    }
  }, [hydrated, tabReady, workflowId])

  const handleTabChange = useCallback(
    (next: string) => {
      if (!isTaskTab(next)) return
      if (next === activeTab) return
      // Only move tasks between buckets on explicit user interaction (tab switch).
      reconcileBuckets()
      setActiveTab(next)
      persistActiveTab(next)
    },
    [activeTab, persistActiveTab, reconcileBuckets]
  )

  useEffect(() => {
    // Snapshot to satisfy lint and ensure we clear the timers that existed for this component instance.
    const timers = timerRef.current
    return () => {
      if (timers.today) window.clearTimeout(timers.today)
      if (timers.other) window.clearTimeout(timers.other)
      if (timers.done) window.clearTimeout(timers.done)
    }
  }, [])

  const handleTodayDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = todayTasks.findIndex((t) => t.id === active.id)
      const newIndex = todayTasks.findIndex((t) => t.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(todayTasks, oldIndex, newIndex)
      setTodayTasks(next)
      schedulePersistOrder('today', next)
    },
    [schedulePersistOrder, setTodayTasks, todayTasks]
  )

  const handleOtherDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = otherTasks.findIndex((t) => t.id === active.id)
      const newIndex = otherTasks.findIndex((t) => t.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(otherTasks, oldIndex, newIndex)
      setOtherTasks(next)
      schedulePersistOrder('other', next)
    },
    [otherTasks, schedulePersistOrder, setOtherTasks]
  )

  const handleDoneDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = done.findIndex((t) => t.id === active.id)
      const newIndex = done.findIndex((t) => t.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(done, oldIndex, newIndex)
      setDoneTasks(next)
      schedulePersistOrder('done', next)
    },
    [done, schedulePersistOrder, setDoneTasks]
  )

  const canDragDrop = hydrated
  const tabContentClassName =
    // Keep panel width stable across tabs by always reserving scrollbar space.
    '-mt-2 grid w-full flex-1 min-h-0 min-w-0 content-start gap-2 overflow-y-scroll overflow-x-hidden pr-4 py-6 scrollbar-gutter-stable'

  return (
    <Card className="flex h-[600px] flex-col gap-1.5 pt-2 pb-0">
      <CardHeader className="gap-1 pb-0 pt-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Tasks</CardTitle>
          <TaskCreateDialog workflowId={workflowId} />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        {!tabReady ? (
          // Keep layout stable; don't show the wrong tab during first paint.
          <div className="grid min-h-0 min-w-0 w-full flex-1 content-start gap-2">
            <div className="h-9 w-[280px] rounded-lg border border-border/60 bg-muted/20" aria-hidden="true" />
            <p className="min-h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
              Loading…
            </p>
            <Separator className="mt-2" />
            <div className={tabContentClassName}>
              <div className="mx-auto w-full max-w-3xl min-w-0">
                <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                  <div className="h-12" />
                  <div className="h-12" />
                  <div className="h-12" />
                </div>
              </div>
            </div>
          </div>
        ) : (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
        >
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>

          {/* Prevent layout jump: reserved space for save status. */}
          <p className="min-h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
            {saving[activeTab] ? 'Saving order…' : ''}
          </p>
          <Separator className="mt-2" />


          <TabsContent
            value="today"
            className={tabContentClassName}
          >
            <div className="mx-auto w-full max-w-3xl min-w-0">
              {todayTasks.length === 0 ? (
                <EmptyState message={hasAny ? 'Nothing due today.' : 'No tasks yet.'} />
              ) : (
                canDragDrop ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTodayDragEnd}>
                    <SortableContext items={todayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                        {todayTasks.map((t) => (
                          <SortableTaskItem key={t.id} task={t} onLocalStatusChange={handleLocalStatusChange} hideDueDate />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                    {todayTasks.map((t) => (
                      <StaticTaskItem key={t.id} task={t} onLocalStatusChange={handleLocalStatusChange} hideDueDate />
                    ))}
                  </div>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="other"
            className={tabContentClassName}
          >
            <div className="mx-auto w-full max-w-3xl min-w-0">
              {otherTasks.length === 0 ? (
                <EmptyState message={hasAny ? 'No other tasks.' : 'No tasks yet.'} />
              ) : (
                canDragDrop ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOtherDragEnd}>
                    <SortableContext items={otherTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                        {otherTasks.map((t) => (
                          <SortableTaskItem key={t.id} task={t} onLocalStatusChange={handleLocalStatusChange} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                    {otherTasks.map((t) => (
                      <StaticTaskItem key={t.id} task={t} onLocalStatusChange={handleLocalStatusChange} />
                    ))}
                  </div>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="done"
            className={tabContentClassName}
          >
            <div className="mx-auto w-full max-w-3xl min-w-0">
              {done.length === 0 ? (
                <EmptyState message="Nothing completed yet." />
              ) : (
                canDragDrop ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDoneDragEnd}>
                    <SortableContext items={done.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                        {done.map((t) => (
                          <SortableTaskItem key={t.id} task={t} onLocalStatusChange={handleLocalStatusChange} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/30 divide-y divide-border/60">
                    {done.map((t) => (
                      <StaticTaskItem key={t.id} task={t} onLocalStatusChange={handleLocalStatusChange} />
                    ))}
                  </div>
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  )
}


