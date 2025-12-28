'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Link2, Pause, Play, RotateCcw, Square } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { playPomodoroStartSound, usePomodoro, formatClock } from '@/features/focus/pomodoro-store'

const NO_TASK_VALUE = '__none__'

function formatDueAt(dueAt: string | null) {
  if (!dueAt) return null
  const t = Date.parse(dueAt)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type FocusModeCardProps = {
  workflowId: string
  tasks: Task[]
  initialTaskId?: string
  onActiveChange?: (active: boolean) => void
  /** Render without Card chrome (useful inside modals/drawers) */
  variant?: 'card' | 'plain'
  /** Hide the "Focus" header/title (useful when the parent provides a title) */
  showTitle?: boolean
}

export function FocusModeCard({
  workflowId,
  tasks,
  initialTaskId,
  onActiveChange,
  variant = 'card',
  showTitle = true,
}: FocusModeCardProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => initialTaskId ?? '')
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  const { isActive, isRunning, secondsLeft, store, setPlannedDurationSeconds, start, pause, resume, stop } =
    usePomodoro(workflowId)
  const plannedDurationSeconds = store.plannedDurationSeconds
  const [startError, setStartError] = useState<string | null>(null)
  const [endError, setEndError] = useState<string | null>(null)

  const taskSelectId = useId()
  const minutesId = useId()

  const taskOptions = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks])
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [selectedTaskId, tasks])
  const selectedDue = useMemo(() => formatDueAt(selectedTask?.due_at ?? null), [selectedTask?.due_at])

  useEffect(() => {
    onActiveChange?.(isActive)
  }, [isActive, onActiveChange])

  const handleTaskValueChange = useCallback((value: string) => {
    setSelectedTaskId(value === NO_TASK_VALUE ? '' : value)
  }, [])

  const handleStartSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (isActive) return
      if (isStarting) return

      setIsStarting(true)
      setStartError(null)

      try {
        const res = await start({ taskId: selectedTaskId || null, durationSeconds: plannedDurationSeconds })
        if (!res.ok) {
          setStartError(res.message)
          toast(res.message)
          return
        }
        try {
          playPomodoroStartSound()
        } catch {
          // noop
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Couldn’t start focus. Try again.'
        setStartError(msg)
        toast(msg)
      } finally {
        setIsStarting(false)
      }
    },
    [isActive, isStarting, plannedDurationSeconds, selectedTaskId, start]
  )

  const handlePauseClick = useCallback(() => pause(), [pause])
  const handleResumeClick = useCallback(() => resume(), [resume])

  const handleStopClick = useCallback(async () => {
    if (!isActive) return
    if (isEnding) return
    setIsEnding(true)
    setEndError(null)
    try {
      const res = await stop({ status: 'cancelled' })
      if (!res.ok) {
        setEndError(res.message)
        toast(res.message)
        return
      }
      toast('Focus saved.')
    } finally {
      setIsEnding(false)
    }
  }, [isActive, isEnding, stop])

  const canStart = !isActive
  const title = selectedTask ? `Focus: ${selectedTask.title}` : 'Pomodoro'

  const content = (
    <div className="grid gap-4">
      {!isActive ? (
        <>
          <div className="grid gap-2">
            <label htmlFor={taskSelectId} className="text-sm font-medium text-muted-foreground">
              Current task (optional)
            </label>
            <Select value={selectedTaskId || NO_TASK_VALUE} onValueChange={handleTaskValueChange} disabled={isActive}>
              <SelectTrigger id={taskSelectId} aria-label="Current task (optional)">
                <SelectValue placeholder="No task selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TASK_VALUE}>No task selected</SelectItem>
                {taskOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor={minutesId} className="text-sm font-medium text-muted-foreground">
              Focus minutes
            </label>
            <Input
              id={minutesId}
              type="number"
              min={1}
              max={360}
              step={1}
              inputMode="numeric"
              value={Math.max(1, Math.round(plannedDurationSeconds / 60))}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                setPlannedDurationSeconds(Math.max(60, Math.min(360 * 60, Math.floor(n) * 60)))
              }}
            />
          </div>

          {selectedTask ? (
            <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
              <p className="text-sm font-medium truncate">{selectedTask.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {selectedDue ? <span className="rounded-md border px-1.5 py-0.5">Due {selectedDue}</span> : null}
                {selectedTask.url ? (
                  <Link
                    href={selectedTask.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
                  >
                    <Link2 aria-hidden="true" className="size-3" />
                    Open link
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {isActive ? (
        <div className="relative -top-7 w-full max-w-[520px] rounded-xl px-4 py-4">
          <p className="text-center text-5xl font-semibold tabular-nums tracking-tight">{formatClock(secondsLeft)}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {isRunning ? (
              <Button type="button" variant="secondary" onClick={handlePauseClick} disabled={isEnding}>
                <Pause aria-hidden="true" className="mr-2 size-4" />
                Pause
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={handleResumeClick} disabled={isEnding}>
                <Play aria-hidden="true" className="mr-2 size-4" />
                Resume
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={handleStopClick} disabled={isEnding}>
              {isEnding ? (
                <Spinner aria-hidden="true" className="mr-2 size-4" />
              ) : (
                <Square aria-hidden="true" className="mr-2 size-4" />
              )}
              {isEnding ? 'Saving…' : 'Stop'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl px-4 py-3">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatClock(secondsLeft)}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => setPlannedDurationSeconds(25 * 60)}>
              <RotateCcw aria-hidden="true" className="mr-2 size-4" />
              Reset
            </Button>
          </div>
        </div>
      )}

      {startError ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {startError}
        </p>
      ) : null}
      {endError ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {endError}
        </p>
      ) : null}

      {!isActive ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <form onSubmit={handleStartSubmit} className="w-full sm:w-auto">
            <Button type="submit" className="w-full sm:w-auto" disabled={!canStart || isStarting}>
              {isStarting ? <Spinner aria-hidden="true" className="mr-2 size-4" /> : null}
              {isStarting ? 'Starting…' : 'Start'}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )

  if (variant === 'plain') {
    return (
      <div className="min-w-0">
        {showTitle ? <p className="text-sm font-medium">{title}</p> : null}
        {showTitle ? <div className="h-3" aria-hidden="true" /> : null}
        {content}
      </div>
    )
  }

  return (
    <Card className={cn(isActive ? 'ring-1 ring-ring/40' : '')}>
      {showTitle ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="grid gap-4">{content}</CardContent>
    </Card>
  )
}
