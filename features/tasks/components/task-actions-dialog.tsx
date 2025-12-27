'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react'

import type { Task } from '@/lib/db/tasks'
import { deleteTaskAction, restoreTaskAction, type TaskActionState } from '@/features/tasks/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskEditForm } from '@/features/tasks/components/task-edit-form'

const initialState: TaskActionState = { ok: false, message: '' }

export function TaskActionsDialog({ task, triggerSize = 'icon-sm' }: { task: Task; triggerSize?: 'icon-xs' | 'icon-sm' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, setDeleteState] = useState<TaskActionState>(initialState)
  const [isDeleting, setIsDeleting] = useState(false)
  const undoFormRef = useRef<HTMLFormElement | null>(null)

  const taskTitle = useMemo(() => (task.title?.trim() ? task.title : 'Untitled task'), [task.title])
  const triggerLabel = useMemo(() => `Open actions for ${taskTitle}`, [taskTitle])
  const deleteLabel = useMemo(() => `Delete ${taskTitle}`, [taskTitle])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setConfirmDelete(false)
      setDeleteState(initialState)
    }
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleDone = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  const handleStartDelete = useCallback(() => setConfirmDelete(true), [])
  const handleCancelDelete = useCallback(() => {
    setConfirmDelete(false)
    setDeleteState(initialState)
  }, [])

  const handleUndo = useCallback(() => {
    undoFormRef.current?.requestSubmit()
  }, [])

  const handleDeleteSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
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
        toast('Task deleted.', {
          duration: 10_000,
          action: { label: 'Undo', onClick: handleUndo },
        })
      } catch {
        setDeleteState({ ok: false, message: 'Couldn’t delete. Try again.' })
      } finally {
        setIsDeleting(false)
      }
    },
    [handleOpenChange, handleUndo, isDeleting, router, task.id, task.workflow_id]
  )

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

        <TaskEditForm task={task} onDone={handleDone} onRequestDelete={confirmDelete ? undefined : handleStartDelete} />

        {confirmDelete ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-1">
                <p className="text-sm font-medium">Delete task?</p>
                <p className="text-xs text-muted-foreground">
                  This will remove “{taskTitle}”. Undo is available for 10 seconds.
                </p>

                {!deleteState.ok && deleteState.message ? (
                  <p className="text-sm text-destructive" role="status" aria-live="polite">
                    {deleteState.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  aria-disabled={isDeleting}
                >
                  Keep
                </Button>

                <form onSubmit={handleDeleteSubmit}>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    aria-label={deleteLabel}
                    disabled={isDeleting}
                    aria-disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2 aria-hidden="true" className="mr-2 size-4" />
                    )}
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        <form ref={undoFormRef} action={restoreTaskAction.bind(null, task.id)} className="sr-only" aria-hidden="true">
          <input type="hidden" name="workflowId" value={task.workflow_id} />
          <button type="submit">Undo delete</button>
        </form>
      </DialogContent>
    </Dialog>
  )
}


