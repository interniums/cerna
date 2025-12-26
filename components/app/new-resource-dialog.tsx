'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createResourceAction } from '@/features/resources/actions'
import { ResourceCreateForm } from '@/features/resources/components/resource-create-form'
import type { Category } from '@/lib/db/categories'
import { SectionSelect } from '@/components/forms/section-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type NewResourceDialogProps = {
  categories: Category[]
  defaultCategoryId?: string
  workflowId: string
  trigger?: 'button' | 'icon' | 'wide'
}

export function NewResourceDialog({ categories, defaultCategoryId, workflowId, trigger = 'button' }: NewResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function handleDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setResetKey((k) => k + 1)
  }

  function closeAndResetDialog() {
    setOpen(false)
    setResetKey((k) => k + 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {trigger === 'icon' ? (
          <Button type="button" size="icon-sm" aria-label="Add resource">
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        ) : trigger === 'wide' ? (
          <Button
            type="button"
            size="lg"
            className="h-14 w-full px-6 text-base bg-card/70 text-foreground shadow-sm backdrop-blur-md border border-border/60 hover:bg-card/85 dark:border-white/15"
          >
            Add resource
          </Button>
        ) : (
          <Button size="sm">Add resource</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
          <DialogDescription className="sr-only">Save a new link to your library.</DialogDescription>
        </DialogHeader>

        <ResourceCreateForm
          key={resetKey}
          action={createResourceAction}
          title="Add resource"
          descriptionSrOnly="Save a new link to your library."
          submitIdleText="Add resource"
          submitPendingText="Adding…"
          successToast="Resource added."
          hiddenInputs={<input type="hidden" name="workflowId" value={workflowId} />}
          extraFields={
            <SectionSelect
              categories={categories}
              defaultValue={defaultCategoryId}
              id="resource-category"
              label="Section"
            />
          }
          onDone={closeAndResetDialog}
          urlInputId="resource-url"
          titleInputId="resource-title"
          notesInputId="resource-notes"
        />

        {/* Keep a DialogClose button for keyboard users who may tab to the footer; ResourceCreateForm already renders one. */}
        <div className="sr-only">
          <DialogClose asChild>
            <button type="button">Close</button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
