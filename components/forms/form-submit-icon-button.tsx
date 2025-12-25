'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type FormSubmitIconButtonProps = Omit<React.ComponentProps<typeof Button>, 'type' | 'children'> & {
  idleIcon: React.ReactNode
  pendingLabel?: string
}

export function FormSubmitIconButton({
  idleIcon,
  pendingLabel = 'Working…',
  disabled,
  'aria-label': ariaLabel,
  ...props
}: FormSubmitIconButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} type="submit" disabled={disabled || pending} aria-disabled={disabled || pending} aria-label={ariaLabel}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : idleIcon}
      <span className="sr-only">{pending ? pendingLabel : ariaLabel}</span>
    </Button>
  )
}


