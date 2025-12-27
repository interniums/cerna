import { getDefaultWorkflowId } from '@/lib/db/workflows'
import { redirect } from 'next/navigation'
import { requireServerUser } from '@/lib/supabase/auth'

export default async function PinnedPage() {
  const user = await requireServerUser()
  const workflowId = await getDefaultWorkflowId({ userId: user.id })
  redirect(`/app/w/${workflowId}/resources`)
}
