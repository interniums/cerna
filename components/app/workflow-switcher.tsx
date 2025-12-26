'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import type { Workflow } from '@/lib/db/workflows'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewWorkflowDialog } from '@/components/app/new-workflow-dialog'

export function WorkflowSwitcher({
  workflows,
  activeWorkflowId,
}: {
  workflows: Workflow[]
  activeWorkflowId: string
}) {
  const router = useRouter()

  const active = useMemo(() => workflows.find((w) => w.id === activeWorkflowId) ?? workflows[0], [activeWorkflowId, workflows])
  const activeName = active?.name ?? 'Workflow'

  const handleGo = useCallback(
    (workflowId: string) => {
      router.push(`/app/w/${workflowId}`)
    },
    [router]
  )

  return (
    <div className="grid gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" className="w-full justify-between">
            <span className="min-w-0 truncate">{activeName}</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Workflows</DropdownMenuLabel>
          {workflows.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => handleGo(w.id)}>
              <span className="min-w-0 truncate">{w.name}</span>
              {w.id === activeWorkflowId ? <span className="ml-auto text-xs text-muted-foreground">Current</span> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <NewWorkflowDialog triggerLabel="New workflow" />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


