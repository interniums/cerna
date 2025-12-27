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

export function NewResourceDialog({
  categories,
  defaultCategoryId,
  workflowId,
  trigger = 'button',
}: NewResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const lastUsedStorageKey = `cerna:lastResourceCategoryId:${workflowId}`
  const [rememberedCategoryId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined
    try {
      const raw = window.localStorage.getItem(lastUsedStorageKey)
      return raw === null ? undefined : raw
    } catch {
      return undefined
    }
  })

  const rememberedIsValid =
    rememberedCategoryId === '' || (rememberedCategoryId ? categories.some((c) => c.id === rememberedCategoryId) : false)

  const effectiveDefaultCategoryId = defaultCategoryId ?? (rememberedIsValid ? rememberedCategoryId : undefined)

  function handleDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setResetKey((k) => k + 1)
  }

  function closeAndResetDialog() {
    setOpen(false)
    setResetKey((k) => k + 1)
  }

  function handleSectionSubmittedValueChange(nextCategoryId: string) {
    try {
      window.localStorage.setItem(lastUsedStorageKey, nextCategoryId)
    } catch {
      // Non-blocking: if storage is unavailable, fall back to normal default behavior.
    }
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
            variant="ghost"
            aria-label="Add resource"
            className="h-14 w-full max-w-[340px] rounded-2xl bg-card/25 px-6 text-foreground shadow-sm backdrop-blur-md hover:bg-card/40 dark:bg-white/5 dark:hover:bg-white/8"
          >
            <Plus aria-hidden="true" className="size-5" />
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
              defaultValue={effectiveDefaultCategoryId}
              id="resource-category"
              label="Section"
              onSubmittedValueChange={handleSectionSubmittedValueChange}
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
            <button type="button">Cancel</button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
