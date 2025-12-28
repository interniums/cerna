'use client'

import { useCallback, useId, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { createWorkflowAction, type WorkflowActionState } from '@/features/workflows/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'

const initialState: WorkflowActionState = { ok: false, message: '' }

type NewWorkflowDialogProps = {
  triggerLabel?: string
  triggerClassName?: string
}

function ThemePicker({
  value,
  onChange,
}: {
  value: 'work' | 'side' | 'learning'
  onChange: (next: 'work' | 'side' | 'learning') => void
}) {
  const handleValueChange = useCallback((v: string) => onChange(v as 'work' | 'side' | 'learning'), [onChange])
  const handleWork = useCallback(() => onChange('work'), [onChange])
  const handleSide = useCallback(() => onChange('side'), [onChange])
  const handleLearning = useCallback(() => onChange('learning'), [onChange])

  return (
    <Tabs value={value} onValueChange={handleValueChange}>
      <TabsList className="w-full bg-muted/50">
        <TabsTrigger value="work" className="flex-1" onClick={handleWork}>
          Work
        </TabsTrigger>
        <TabsTrigger value="side" className="flex-1" onClick={handleSide}>
          Side
        </TabsTrigger>
        <TabsTrigger value="learning" className="flex-1" onClick={handleLearning}>
          Learning
        </TabsTrigger>
      </TabsList>
      <TabsContent value={value} className="sr-only">
        Selected theme: {value}
      </TabsContent>
    </Tabs>
  )
}

export function NewWorkflowDialog({ triggerLabel = 'New workflow', triggerClassName }: NewWorkflowDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [theme, setTheme] = useState<'work' | 'side' | 'learning'>('work')
  const [isCreating, setIsCreating] = useState(false)

  const [state, setState] = useState<WorkflowActionState>(initialState)
  const nameId = useId()

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setResetKey((k) => k + 1)
      setTheme('work')
    }
  }, [])

  const handleTriggerClick = useCallback(() => handleOpenChange(true), [handleOpenChange])

  const handleCreated = useCallback(() => {
    toast('Workflow created.')
    handleOpenChange(false)
    router.refresh()
  }, [handleOpenChange, router])

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (isCreating) return

      setIsCreating(true)
      setState(initialState)

      try {
        const formData = new FormData(e.currentTarget)
        const next = await createWorkflowAction(state, formData)
        setState(next)
        if (!next.ok) return
        handleCreated()
      } catch {
        setState({ ok: false, message: 'Couldn’t save changes. Try again.' })
      } finally {
        setIsCreating(false)
      }
    },
    [handleCreated, isCreating, state]
  )

  const errorMessage = state.ok ? '' : state.message
  const title = useMemo(() => 'New workflow', [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleTriggerClick}
        aria-label={triggerLabel}
        className={cn(triggerClassName)}
      >
        <Plus aria-hidden="true" className="mr-2 size-4" />
        {triggerLabel}
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Create a space for a separate context.</DialogDescription>
        </DialogHeader>

        <form key={resetKey} onSubmit={handleCreateSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={nameId} className="text-muted-foreground">
              Name
            </Label>
            <Input id={nameId} name="name" placeholder="Side Project" autoComplete="off" required />
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Theme</Label>
            <input type="hidden" name="theme" value={theme} />
            <ThemePicker value={theme} onChange={setTheme} />
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="status" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={isCreating} aria-disabled={isCreating}>
              {isCreating ? <Spinner aria-hidden="true" className="mr-2 size-4" /> : null}
              {isCreating ? 'Creating…' : 'Create'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


