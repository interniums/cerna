'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site/url'

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export type AuthActionState = { ok: true } | { ok: false; message: string }

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return null
  if (!('message' in error)) return null
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : null
}

function mapSupabaseAuthErrorToMessage(error: unknown, mode: 'login' | 'signup'): string {
  const message = (getErrorMessage(error) ?? '').toLowerCase()

  // Keep user-facing copy short, direct, and safe (don’t leak internals).
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.'
  if (message.includes('too many requests') || message.includes('rate limit'))
    return 'Too many attempts. Try again in a bit.'

  return mode === 'login' ? 'Sign in failed. Try again.' : 'Sign up failed. Try again.'
}

export async function loginAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = AuthSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, message: 'Check your email and password.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    console.error('[loginAction] Supabase signInWithPassword error', {
      message: error.message,
      status: (error as unknown as { status?: unknown }).status,
      code: (error as unknown as { code?: unknown }).code,
      name: (error as unknown as { name?: unknown }).name,
    })
    return { ok: false, message: mapSupabaseAuthErrorToMessage(error, 'login') }
  }

  redirect('/app')
}

export async function signupAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = AuthSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, message: 'Use a valid email and a stronger password.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    console.error('[signupAction] Supabase signUp error', {
      message: error.message,
      status: (error as unknown as { status?: unknown }).status,
      code: (error as unknown as { code?: unknown }).code,
      name: (error as unknown as { name?: unknown }).name,
    })
    return { ok: false, message: mapSupabaseAuthErrorToMessage(error, 'signup') }
  }

  // If email confirmations are enabled, the user may need to confirm first.
  redirect('/login?checkEmail=1')
}
