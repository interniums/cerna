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
    return { ok: false, message: 'Sign in failed. Try again.' }
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
    return { ok: false, message: 'Sign up failed. Try again.' }
  }

  // If email confirmations are enabled, the user may need to confirm first.
  redirect('/login?checkEmail=1')
}
