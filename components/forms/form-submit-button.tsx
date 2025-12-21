'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type FormSubmitButtonProps = React.ComponentProps<typeof Button> & {
  idleText: string
  pendingText?: string
}

export function FormSubmitButton({ idleText, pendingText = 'Working…', disabled, ...props }: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        idleText
      )}
    </Button>
  )
}
