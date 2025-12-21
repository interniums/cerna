'use server'

import { redirect } from 'next/navigation'

import { softDeleteResource } from '@/lib/db/resources'
import { requireServerUser } from '@/lib/supabase/auth'

function safeReturnTo(value: string | null) {
  if (!value) return '/app/all'
  if (value.startsWith('/app')) return value
  return '/app/all'
}

export async function confirmDeleteResourceAction(resourceId: string, returnTo?: string) {
  const user = await requireServerUser()
  await softDeleteResource({ userId: user.id, resourceId })

  const target = safeReturnTo(returnTo ?? null)
  const url = new URL(target, 'http://internal')
  url.searchParams.set('undo', resourceId)
  redirect(url.pathname + url.search)
}
