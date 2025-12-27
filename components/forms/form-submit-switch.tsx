'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

type FormSubmitSwitchProps = {
  checked: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  pendingLabel?: string
}

export function FormSubmitSwitch({
  checked,
  disabled,
  className,
  pendingLabel = 'Saving…',
  ...aria
}: FormSubmitSwitchProps) {
  const { pending } = useFormStatus()
  const isDisabled = Boolean(disabled || pending)

  return (
    <button
      type="submit"
      role="switch"
      aria-checked={checked}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border/60 bg-muted/70 p-0.5 transition-colors',
        checked ? 'bg-primary/20' : '',
        isDisabled ? 'cursor-not-allowed opacity-60' : '',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-4 items-center justify-center rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      >
        {pending ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
      </span>
      <span className="sr-only">{pending ? pendingLabel : 'Toggle'}</span>
    </button>
  )
}



