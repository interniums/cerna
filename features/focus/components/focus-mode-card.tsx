'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Link2, Pause, Play, RotateCcw, Square } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { endFocusSessionAction, startFocusSessionAction, type FocusActionState } from '@/features/focus/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

const initialState: FocusActionState = { ok: false, message: '' }

const NO_TASK_VALUE = '__none__'

function formatClock(secondsTotal: number) {
  const s = Math.max(0, Math.floor(secondsTotal))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

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
}

export function FocusModeCard({ workflowId, tasks, initialTaskId, onActiveChange }: FocusModeCardProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => initialTaskId ?? '')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startState, setStartState] = useState<FocusActionState>(initialState)
  const [endState, setEndState] = useState<FocusActionState>(initialState)
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  const tickRef = useRef<number | null>(null)
  const targetEndMsRef = useRef<number | null>(null)

  const taskSelectId = useId()
  const endFormRef = useRef<HTMLFormElement | null>(null)

  const taskOptions = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks])
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [selectedTaskId, tasks])
  const selectedDue = useMemo(() => formatDueAt(selectedTask?.due_at ?? null), [selectedTask?.due_at])

  useEffect(() => {
    onActiveChange?.(Boolean(sessionId))
  }, [onActiveChange, sessionId])

  const clearTicker = useCallback(() => {
    if (tickRef.current != null) window.clearInterval(tickRef.current)
    tickRef.current = null
  }, [])

  const resetTimer = useCallback(() => {
    clearTicker()
    targetEndMsRef.current = null
    setIsRunning(false)
    setSecondsLeft(25 * 60)
  }, [clearTicker])

  const startLocalTimer = useCallback((durationSeconds: number) => {
    clearTicker()
    targetEndMsRef.current = Date.now() + durationSeconds * 1000
    setIsRunning(true)
    setSecondsLeft(durationSeconds)

    tickRef.current = window.setInterval(() => {
      const endMs = targetEndMsRef.current
      if (!endMs) return
      const remaining = Math.ceil((endMs - Date.now()) / 1000)
      setSecondsLeft(remaining)
    }, 250)
  }, [clearTicker])

  const handlePauseClick = useCallback(() => {
    if (!isRunning) return
    clearTicker()
    targetEndMsRef.current = null
    setIsRunning(false)
  }, [clearTicker, isRunning])

  const handleResumeClick = useCallback(() => {
    if (isRunning) return
    if (!sessionId) return
    startLocalTimer(secondsLeft)
  }, [isRunning, secondsLeft, sessionId, startLocalTimer])

  const handleResetClick = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  const handleTaskValueChange = useCallback((value: string) => {
    setSelectedTaskId(value === NO_TASK_VALUE ? '' : value)
  }, [])

  const handleStartSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (sessionId) return
      if (isStarting) return

      setIsStarting(true)
      setStartState(initialState)

      try {
        const formData = new FormData(e.currentTarget)
        const next = await startFocusSessionAction(startState, formData)
        setStartState(next)
        if (!next.ok) return
        if (!next.sessionId) {
          setStartState({ ok: false, message: 'Couldn’t start focus. Try again.' })
          return
        }

        setSessionId(next.sessionId)
        startLocalTimer(25 * 60)
      } catch {
        setStartState({ ok: false, message: 'Couldn’t start focus. Try again.' })
      } finally {
        setIsStarting(false)
      }
    },
    [isStarting, sessionId, startLocalTimer, startState]
  )

  const handleEndSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!sessionId) return
      if (isEnding) return

      setIsEnding(true)
      setEndState(initialState)

      try {
        const formData = new FormData(e.currentTarget)
        const next = await endFocusSessionAction(endState, formData)
        setEndState(next)
        if (!next.ok) return

        toast('Focus saved.')
        setSessionId(null)
        resetTimer()
      } catch {
        setEndState({ ok: false, message: 'Couldn’t save. Try again.' })
      } finally {
        setIsEnding(false)
      }
    },
    [endState, isEnding, resetTimer, sessionId]
  )

  const submitEnd = useCallback(
    (status: 'completed' | 'cancelled') => {
      if (!sessionId) return
      const form = endFormRef.current
      if (!form) return
      const statusEl = form.querySelector('input[name="status"]') as HTMLInputElement | null
      if (statusEl) statusEl.value = status
      clearTicker()
      targetEndMsRef.current = null
      form.requestSubmit()
    },
    [clearTicker, sessionId]
  )

  const handleEndEarlyClick = useCallback(() => {
    submitEnd('cancelled')
  }, [submitEnd])

  useEffect(() => {
    if (!sessionId) return
    if (secondsLeft > 0) return
    submitEnd('completed')
  }, [secondsLeft, sessionId, submitEnd])

  useEffect(() => {
    return () => {
      clearTicker()
    }
  }, [clearTicker])

  const isActive = Boolean(sessionId)
  const canStart = !isActive
  const title = selectedTask ? `Focus: ${selectedTask.title}` : 'Focus'

  return (
    <Card className={cn(isActive ? 'ring-1 ring-ring/40' : '')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
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

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatClock(secondsLeft)}</p>
          <div className="flex items-center gap-2">
            {isActive ? (
              isRunning ? (
                <Button type="button" variant="secondary" onClick={handlePauseClick}>
                  <Pause aria-hidden="true" className="mr-2 size-4" />
                  Pause
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={handleResumeClick}>
                  <Play aria-hidden="true" className="mr-2 size-4" />
                  Resume
                </Button>
              )
            ) : null}
            <Button type="button" variant="ghost" onClick={handleResetClick} disabled={isActive}>
              <RotateCcw aria-hidden="true" className="mr-2 size-4" />
              Reset
            </Button>
          </div>
        </div>

        {!startState.ok && startState.message ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {startState.message}
          </p>
        ) : null}

        {!endState.ok && endState.message ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {endState.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {isActive ? (
            <>
              <form ref={endFormRef} onSubmit={handleEndSubmit} className="w-full sm:w-auto">
                <input type="hidden" name="sessionId" value={sessionId ?? ''} />
                <input type="hidden" name="status" value="completed" />
                <Button type="submit" variant="secondary" className="w-full sm:w-auto" disabled={isEnding}>
                  {isEnding ? <Spinner aria-hidden="true" className="mr-2 size-4" /> : <Square aria-hidden="true" className="mr-2 size-4" />}
                  {isEnding ? 'Saving…' : 'End focus'}
                </Button>
              </form>
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={handleEndEarlyClick} disabled={isEnding}>
                Cancel
              </Button>
            </>
          ) : (
            <form onSubmit={handleStartSubmit} className="w-full sm:w-auto">
              <input type="hidden" name="workflowId" value={workflowId} />
              <input type="hidden" name="taskId" value={selectedTaskId || ''} />
              <Button type="submit" className="w-full sm:w-auto" disabled={!canStart || isStarting}>
                {isStarting ? <Spinner aria-hidden="true" className="mr-2 size-4" /> : null}
                {isStarting ? 'Starting…' : 'Start focus'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Focus sessions are saved automatically when you end focus.</p>
      </CardContent>
    </Card>
  )
}


