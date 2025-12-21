'use client'

import { useActionState } from 'react'

import type { AuthActionState } from '@/app/(auth)/actions'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type EmailPasswordFormProps = {
  action: (prevState: AuthActionState, formData: FormData) => Promise<AuthActionState>
  submitText: string
  pendingText?: string
}

const initialState: AuthActionState = { ok: false, message: '' }

export function EmailPasswordForm({ action, submitText, pendingText }: EmailPasswordFormProps) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </div>

      {state.ok === false && state.message ? (
        <p className="text-sm text-destructive" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <FormSubmitButton className="w-full" idleText={submitText} pendingText={pendingText} />
    </form>
  )
}
