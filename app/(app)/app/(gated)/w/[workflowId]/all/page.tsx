import { requireServerUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'

type WorkflowAllResourcesPageProps = {
  params: Promise<{ workflowId: string }>
}

export default async function WorkflowAllResourcesPage({ params }: WorkflowAllResourcesPageProps) {
  const { workflowId } = await params
  await requireServerUser()
  redirect(`/app/w/${workflowId}/resources`)
}


