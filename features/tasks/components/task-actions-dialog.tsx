'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { deleteTaskAction, restoreTaskAction, type TaskActionState } from '@/features/tasks/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskEditForm } from '@/features/tasks/components/task-edit-form'
import { Spinner } from '@/components/ui/spinner'

const initialState: TaskActionState = { ok: false, message: '' }

type ToastState = 'idle' | 'undoing' | 'restored'

function TaskUndoToastContent({ state, onUndo }: { state: ToastState; onUndo: () => void }) {
  if (state === 'restored') {
    return (
      <div className="flex w-[356px] items-center gap-2 rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg">
        <span className="text-sm">Restored.</span>
      </div>
    )
  }

  return (
    <div className="flex w-[356px] items-center justify-between gap-2 rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg">
      <span className="text-sm">Task deleted.</span>
      <button
        type="button"
        onClick={onUndo}
        disabled={state === 'undoing'}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70"
      >
        {state === 'undoing' ? (
          <>
            <Spinner className="size-3" aria-hidden="true" />
            Undoing…
          </>
        ) : (
          'Undo'
        )}
      </button>
    </div>
  )
}

export function TaskActionsDialog({
  task,
  triggerSize = 'icon-sm',
}: {
  task: Task
  triggerSize?: 'icon-xs' | 'icon-sm'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleteState, setDeleteState] = useState<TaskActionState>(initialState)
  const [isDeleting, setIsDeleting] = useState(false)
  const toastIdRef = useRef<string | number | null>(null)
  const isProcessingRef = useRef(false)
  const showToastRef = useRef<(state: ToastState) => void>(() => {})

  const taskTitle = useMemo(() => (task.title?.trim() ? task.title : 'Untitled task'), [task.title])
  const triggerLabel = useMemo(() => `Open actions for ${taskTitle}`, [taskTitle])

  const showToast = useCallback(
    (state: ToastState) => {
      // Dismiss existing toast first
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current)
      }

      const handleClick = () => {
        if (isProcessingRef.current) return
        isProcessingRef.current = true

        // Show undoing state immediately
        showToastRef.current('undoing')

        const fd = new FormData()
        fd.set('workflowId', task.workflow_id)

        void restoreTaskAction(task.id, fd)
          .then(() => {
            router.refresh()
            showToastRef.current('restored')
            // Auto-dismiss after showing "Restored." briefly
            setTimeout(() => {
              if (toastIdRef.current != null) toast.dismiss(toastIdRef.current)
            }, 1500)
          })
          .catch(() => {
            toast("Couldn't undo. Try again.")
            isProcessingRef.current = false
            showToastRef.current('idle')
          })
      }

      toastIdRef.current = toast.custom(() => <TaskUndoToastContent state={state} onUndo={handleClick} />, {
        duration: state === 'undoing' || state === 'restored' ? Infinity : 10_000,
      })
    },
    [router, task.id, task.workflow_id]
  )

  // Keep ref in sync
  useEffect(() => {
    showToastRef.current = showToast
  })

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setDeleteState(initialState)
    }
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleDone = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  const runDelete = useCallback(async () => {
    if (isDeleting) return

    setIsDeleting(true)
    setDeleteState(initialState)
    try {
      const fd = new FormData()
      fd.set('workflowId', task.workflow_id)
      fd.set('taskId', task.id)
      const next = await deleteTaskAction(initialState, fd)
      setDeleteState(next)
      if (!next.ok) return

      handleOpenChange(false)
      router.refresh()
      isProcessingRef.current = false
      showToast('idle')
    } catch {
      setDeleteState({ ok: false, message: "Couldn't delete. Try again." })
    } finally {
      setIsDeleting(false)
    }
  }, [handleOpenChange, isDeleting, router, showToast, task.id, task.workflow_id])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size={triggerSize}
        className="cerna-hover-control"
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={handleTriggerClick}
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </Button>

      <DialogContent className="max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription className="sr-only">Edit or delete this task.</DialogDescription>
        </DialogHeader>

        <TaskEditForm
          task={task}
          onDone={handleDone}
          onRequestDelete={runDelete}
          isDeleting={isDeleting}
          deleteErrorMessage={!deleteState.ok && deleteState.message ? deleteState.message : ''}
        />
      </DialogContent>
    </Dialog>
  )
}
