'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'

import { createCategoryAction, type CategoryActionState } from '@/features/categories/actions'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: CategoryActionState = { ok: false, message: '' }

type NewCategoryDialogBodyProps = {
  onCreated: () => void
}

function NewCategoryDialogBody({ onCreated }: NewCategoryDialogBodyProps) {
  const [state, formAction] = useActionState(createCategoryAction, initialState)

  useEffect(() => {
    if (state.ok) onCreated()
  }, [state.ok, onCreated])

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New category</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="category-name">Name</Label>
          <Input id="category-name" name="name" placeholder="Work" autoComplete="off" required />
        </div>

        {state.ok ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Created. You can close this.
          </p>
        ) : state.message ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <FormSubmitButton idleText="Create" pendingText="Creating…" />
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </div>
      </form>
    </DialogContent>
  )
}

export function NewCategoryDialog() {
  const [resetKey, setResetKey] = useState(0)
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setResetKey((k) => k + 1)
  }, [])

  const handleCreated = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          New category
        </Button>
      </DialogTrigger>
      <NewCategoryDialogBody key={resetKey} onCreated={handleCreated} />
    </Dialog>
  )
}
