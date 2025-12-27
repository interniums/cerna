import { redirect } from 'next/navigation'

import { requireServerUser } from '@/lib/supabase/auth'
import { getDefaultWorkflowId } from '@/lib/db/workflows'

export default async function AllResourcesPage() {
  const user = await requireServerUser()
  const workflowId = await getDefaultWorkflowId({ userId: user.id })
  redirect(`/app/w/${workflowId}/resources`)
}
