'use client'

import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type FormSubmitButtonProps = React.ComponentProps<typeof Button> & {
  idleText: string
  pendingText?: string
  idleIcon?: React.ReactNode
  hideLabel?: boolean
}

export function FormSubmitButton({
  idleText,
  pendingText = 'Working…',
  idleIcon,
  hideLabel = false,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>
      {pending ? (
        <>
          <Spinner className={hideLabel ? 'mr-0 size-4' : 'mr-2 size-4'} aria-hidden="true" />
          {hideLabel ? <span aria-hidden="true" className="opacity-0">{pendingText}</span> : pendingText}
          <span className="sr-only">{pendingText}</span>
        </>
      ) : (
        <>
          {idleIcon ? idleIcon : null}
          {hideLabel ? <span aria-hidden="true" className="opacity-0">{idleText}</span> : idleText}
          <span className="sr-only">{idleText}</span>
        </>
      )}
    </Button>
  )
}
