import type { Metadata } from 'next'
import Link from 'next/link'

import { loginAction } from '@/app/(auth)/actions'
import { AuthCard } from '@/components/auth/auth-card'
import { EmailPasswordForm } from '@/components/auth/email-password-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

type LoginPageProps = {
  searchParams?: Promise<{ checkEmail?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {}
  const shouldShowCheckEmail = params.checkEmail === '1'

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Keep your essentials close."
      footerText="New here?"
      footerHref="/signup"
      footerLinkText="Create an account"
    >
      {shouldShowCheckEmail ? (
        <p className="text-sm text-muted-foreground">
          Check your email to confirm your account, then{' '}
          <Link href="/login" className="underline-offset-4 hover:underline">
            sign in
          </Link>
          .
        </p>
      ) : null}

      <EmailPasswordForm action={loginAction} submitText="Sign in" pendingText="Signing in…" />
    </AuthCard>
  )
}
