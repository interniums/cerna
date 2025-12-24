'use client'

import { useActionState, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash2 } from 'lucide-react'

import { type CategoryActionState, deleteCategoryAction, renameCategoryAction } from '@/features/categories/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Separator } from '@/components/ui/separator'

const initialState: CategoryActionState = { ok: false, message: '' }

type EditCategoryDialogProps = {
  categoryId: string
  initialName: string
}

function RenameForm({
  categoryId,
  initialName,
  onSaved,
}: {
  categoryId: string
  initialName: string
  onSaved: () => void
}) {
  const [state, formAction] = useActionState(renameCategoryAction, initialState)
  const inputId = useId()

  useEffect(() => {
    if (state.ok) onSaved()
  }, [onSaved, state.ok])

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="categoryId" value={categoryId} />

      <div className="grid gap-2">
        <Label htmlFor={inputId} className="text-muted-foreground">
          Name
        </Label>
        <Input id={inputId} name="name" defaultValue={initialName} autoComplete="off" required />
      </div>

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <FormSubmitButton idleText="Save" pendingText="Saving…" />
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Close
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}

function DeleteForm({ categoryId, onDeleted }: { categoryId: string; onDeleted: () => void }) {
  const [state, formAction] = useActionState(deleteCategoryAction, initialState)

  useEffect(() => {
    if (state.ok) onDeleted()
  }, [onDeleted, state.ok])

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="categoryId" value={categoryId} />

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <FormSubmitButton
          variant="destructive"
          className="font-semibold uppercase tracking-wide"
          idleText="Delete category"
          pendingText="Deleting…"
        />
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}

export function EditCategoryDialog({ categoryId, initialName }: EditCategoryDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setConfirmDelete(false)
  }, [])

  const handleTriggerClick = useCallback(() => {
    handleOpenChange(true)
  }, [handleOpenChange])

  const handleSaved = useCallback(() => {
    handleOpenChange(false)
    router.refresh()
  }, [handleOpenChange, router])

  const handleDeleted = useCallback(() => {
    handleOpenChange(false)
    router.replace('/app/all')
    router.refresh()
  }, [handleOpenChange, router])

  const handleStartDelete = useCallback(() => setConfirmDelete(true), [])
  const handleCancelDelete = useCallback(() => setConfirmDelete(false), [])

  const triggerLabel = useMemo(() => `Edit category ${initialName}`, [initialName])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="secondary" size="icon-sm" aria-label={triggerLabel} onClick={handleTriggerClick}>
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription className="sr-only">Rename or delete this category.</DialogDescription>
        </DialogHeader>

        <RenameForm categoryId={categoryId} initialName={initialName} onSaved={handleSaved} />

        <Separator className="my-2" />

        <div className="grid gap-2">
          <p className="text-sm font-medium">Delete category</p>
          <p className="text-sm text-muted-foreground">
            Resources will stay saved, but become uncategorized. This can’t be undone.
          </p>

          {confirmDelete ? (
            <>
              <DeleteForm categoryId={categoryId} onDeleted={handleDeleted} />
              <Button type="button" variant="ghost" size="sm" onClick={handleCancelDelete}>
                Keep category
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-12 font-semibold uppercase tracking-wide"
              onClick={handleStartDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
