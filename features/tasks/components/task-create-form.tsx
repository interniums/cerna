'use client'

import { useActionState, useEffect, useId, useRef } from 'react'
import { toast } from 'sonner'

import { createTaskAction, type TaskActionState } from '@/features/tasks/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSubmitButton } from '@/components/forms/form-submit-button'

const initialState: TaskActionState = { ok: false, message: '' }

export function TaskCreateForm({ workflowId }: { workflowId: string }) {
  const [state, formAction] = useActionState(createTaskAction, initialState)
  const formRef = useRef<HTMLFormElement | null>(null)
  const titleId = useId()
  const dueId = useId()
  const urlId = useId()

  useEffect(() => {
    if (!state.ok) return
    toast.success('Task added.')
    formRef.current?.reset()
  }, [state.ok])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">New task</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form ref={formRef} action={formAction} className="grid gap-3">
          <input type="hidden" name="workflowId" value={workflowId} />

          <div className="grid gap-2">
            <Label htmlFor={titleId} className="text-muted-foreground">
              Title
            </Label>
            <Input
              id={titleId}
              name="title"
              placeholder="Add a task…"
              autoComplete="off"
              autoFocus
              inputMode="text"
              enterKeyHint="done"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={dueId} className="text-muted-foreground">
                Due date (optional)
              </Label>
              <Input id={dueId} name="dueDate" type="date" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={urlId} className="text-muted-foreground">
                Link (optional)
              </Label>
              <Input id={urlId} name="url" placeholder="https://…" autoComplete="off" inputMode="url" />
            </div>
          </div>

          {!state.ok && state.message ? (
            <p className="text-sm text-destructive" role="status" aria-live="polite">
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <FormSubmitButton className="w-full sm:w-auto" idleText="Add task" pendingText="Adding…" />
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


