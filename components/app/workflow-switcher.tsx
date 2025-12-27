'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Workflow } from 'lucide-react'

import type { Workflow as WorkflowType } from '@/lib/db/workflows'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/app/sidebar-context'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type WorkflowSwitcherProps = {
  workflows: WorkflowType[]
  activeWorkflowId: string
}

// Legacy non-collapsible version for backwards compatibility
export function WorkflowSwitcher({ workflows, activeWorkflowId }: WorkflowSwitcherProps) {
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

// Collapsible version that responds to sidebar state
export function WorkflowSwitcherCollapsible({ workflows, activeWorkflowId }: WorkflowSwitcherProps) {
  const router = useRouter()
  const { isCollapsed } = useSidebar()

  const active = useMemo(() => workflows.find((w) => w.id === activeWorkflowId) ?? workflows[0], [activeWorkflowId, workflows])
  const activeName = active?.name ?? 'Workflow'

  const handleGo = useCallback(
    (workflowId: string) => {
      router.push(`/app/w/${workflowId}`)
    },
    [router]
  )

  const trigger = (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        isCollapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
      )}
    >
      {isCollapsed ? (
        <Workflow aria-hidden="true" className="size-4" />
      ) : (
        <>
          <span className="min-w-0 truncate">{activeName}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-70" />
        </>
      )}
    </Button>
  )

  const dropdownContent = (
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
  )

  if (isCollapsed) {
    return (
      <div className="flex justify-center">
        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {activeName}
            </TooltipContent>
          </Tooltip>
          {dropdownContent}
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        {dropdownContent}
      </DropdownMenu>
    </div>
  )
}
