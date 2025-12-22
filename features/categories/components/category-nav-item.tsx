'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { deleteCategoryAction, renameCategoryAction, type CategoryActionState } from '@/features/categories/actions'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSubmitButton } from '@/components/forms/form-submit-button'

const initialState: CategoryActionState = { ok: false, message: '' }

type CategoryNavItemProps = {
  id: string
  name: string
}

function RenameCategoryDialogBody(props: { categoryId: string; initialName: string; onDone: () => void }) {
  const [state, formAction] = useActionState(renameCategoryAction, initialState)

  useEffect(() => {
    if (state.ok) props.onDone()
  }, [props, state.ok])

  const inputId = `rename-category-${props.categoryId}`

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="categoryId" value={props.categoryId} />

      <div className="grid gap-2">
        <Label htmlFor={inputId}>Name</Label>
        <Input id={inputId} name="name" defaultValue={props.initialName} autoComplete="off" required />
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
            Cancel
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}

function RenameCategoryDialog(props: {
  categoryId: string
  initialName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const handleDone = useCallback(() => {
    props.onOpenChange(false)
  }, [props])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename category</DialogTitle>
        </DialogHeader>

        {props.open ? (
          <RenameCategoryDialogBody
            key={`rename-${props.categoryId}`}
            categoryId={props.categoryId}
            initialName={props.initialName}
            onDone={handleDone}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryDialogBody(props: { categoryId: string; onDone: () => void }) {
  const [state, formAction] = useActionState(deleteCategoryAction, initialState)

  useEffect(() => {
    if (state.ok) props.onDone()
  }, [props, state.ok])

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="categoryId" value={props.categoryId} />

      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <FormSubmitButton variant="destructive" idleText="Delete" pendingText="Deleting…" />
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}

function DeleteCategoryDialog(props: {
  categoryId: string
  categoryName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  isActiveCategory: boolean
}) {
  const router = useRouter()

  const handleDone = useCallback(() => {
    props.onOpenChange(false)
    if (props.isActiveCategory) router.replace('/app/all')
  }, [props, router])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete category?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will remove <span className="font-medium text-foreground">{props.categoryName}</span>. Resources in this
          category will stay saved, but become uncategorized. This can’t be undone.
        </p>

        {props.open ? (
          <DeleteCategoryDialogBody
            key={`delete-${props.categoryId}`}
            categoryId={props.categoryId}
            onDone={handleDone}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function CategoryNavItem({ id, name }: CategoryNavItemProps) {
  const pathname = usePathname()
  const href = useMemo(() => `/app/category/${id}`, [id])
  const isActive = pathname === href

  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleRename = useCallback(() => setRenameOpen(true), [])
  const handleDelete = useCallback(() => setDeleteOpen(true), [])

  return (
    <>
      <div
        className={cn(
          'group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
          isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Link href={href} className="min-w-0 flex-1 truncate">
          {name}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`Edit ${name}`}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RenameCategoryDialog categoryId={id} initialName={name} open={renameOpen} onOpenChange={setRenameOpen} />

      <DeleteCategoryDialog
        categoryId={id}
        categoryName={name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isActiveCategory={isActive}
      />
    </>
  )
}
