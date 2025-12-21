import type { Metadata } from 'next'

import { signupAction } from '@/app/(auth)/actions'
import { AuthCard } from '@/components/auth/auth-card'
import { EmailPasswordForm } from '@/components/auth/email-password-form'

export const metadata: Metadata = {
  title: 'Create account',
}

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start building your calm home base."
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkText="Sign in"
    >
      <EmailPasswordForm action={signupAction} submitText="Create account" pendingText="Creating…" />
    </AuthCard>
  )
}
