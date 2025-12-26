'use client'

import Link from 'next/link'
import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Link2, Loader2, Trash2 } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { deleteTaskAction, restoreTaskAction, toggleTaskStatusAction, type TaskActionState } from '@/features/tasks/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormSubmitIconButton } from '@/components/forms/form-submit-icon-button'
import { cn } from '@/lib/utils'

const initialState: TaskActionState = { ok: false, message: '' }

function formatDueAt(dueAt: string | null) {
  if (!dueAt) return null
  const t = Date.parse(dueAt)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function TaskStatusButton({ task }: { task: Task }) {
  const [state, formAction] = useActionState(toggleTaskStatusAction, initialState)
  const router = useRouter()

  const nextStatus = task.status === 'done' ? 'open' : 'done'
  const ariaLabel = task.status === 'done' ? 'Mark as not done' : 'Mark as done'

  useEffect(() => {
    if (!state.ok) return
    router.refresh()
  }, [router, state.ok])

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="nextStatus" value={nextStatus} />
      <FormSubmitIconButton
        variant="ghost"
        size="icon-sm"
        className="h-9 w-9"
        aria-label={ariaLabel}
        pendingLabel={ariaLabel}
        idleIcon={
          task.status === 'done' ? (
            <CheckCircle2 aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Circle aria-hidden="true" className="text-muted-foreground" />
          )
        }
      />
      {!state.ok && state.message ? (
        <p className="sr-only" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

function DeleteTaskDialog({ workflowId, taskId, taskTitle }: { workflowId: string; taskId: string; taskTitle: string }) {
  const titleId = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<TaskActionState>(initialState)
  const [isDeleting, setIsDeleting] = useState(false)
  const undoFormRef = useRef<HTMLFormElement | null>(null)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleUndo = useCallback(() => {
    undoFormRef.current?.requestSubmit()
  }, [])

  const handleDeleteSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (isDeleting) return

      setIsDeleting(true)
      setState(initialState)

      try {
        const formData = new FormData(e.currentTarget)
        const next = await deleteTaskAction(state, formData)
        setState(next)
        if (!next.ok) return

        handleOpenChange(false)
        router.refresh()

        toast('Task deleted.', {
          duration: 10_000,
          action: { label: 'Undo', onClick: handleUndo },
        })
      } catch {
        setState({ ok: false, message: 'Couldn’t delete. Try again.' })
      } finally {
        setIsDeleting(false)
      }
    },
    [handleOpenChange, handleUndo, isDeleting, router, state]
  )

  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete task" onClick={handleTriggerClick}>
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle id={titleId}>Delete task?</DialogTitle>
            <DialogDescription>
              This will remove “{taskTitle}”. Undo is available for 10 seconds.
            </DialogDescription>
          </DialogHeader>

          {!state.ok && state.message ? (
            <p className="text-sm text-destructive" role="status" aria-live="polite">
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <form onSubmit={handleDeleteSubmit}>
              <input type="hidden" name="workflowId" value={workflowId} />
              <input type="hidden" name="taskId" value={taskId} />
              <Button type="submit" variant="destructive" className="w-full sm:w-auto" disabled={isDeleting} aria-disabled={isDeleting}>
                {isDeleting ? <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="mr-2 size-4" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </form>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <form ref={undoFormRef} action={restoreTaskAction.bind(null, taskId)} className="sr-only" aria-hidden="true">
        <input type="hidden" name="workflowId" value={workflowId} />
        <button type="submit">Undo delete</button>
      </form>
    </>
  )
}

export function TaskRow({ task }: { task: Task }) {
  const due = useMemo(() => formatDueAt(task.due_at), [task.due_at])
  const primary = task.title?.trim() ? task.title : 'Untitled task'

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-xs',
        task.status === 'done' ? 'opacity-70' : ''
      )}
    >
      <TaskStatusButton task={task} />

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', task.status === 'done' ? 'line-through' : '')}>{primary}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {due ? <span className="rounded-md border px-1.5 py-0.5">Due {due}</span> : null}
          {task.url ? (
            <Link
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
            >
              <Link2 aria-hidden="true" className="size-3" />
              Link
            </Link>
          ) : null}
        </div>
      </div>

      <DeleteTaskDialog workflowId={task.workflow_id} taskId={task.id} taskTitle={primary} />
    </div>
  )
}


