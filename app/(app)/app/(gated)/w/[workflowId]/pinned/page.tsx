import { requireServerUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'

type WorkflowPinnedPageProps = {
  params: Promise<{ workflowId: string }>
}

export default async function WorkflowPinnedPage({ params }: WorkflowPinnedPageProps) {
  const { workflowId } = await params
  await requireServerUser()
  redirect(`/app/w/${workflowId}/resources`)
}


