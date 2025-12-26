import { redirect } from 'next/navigation'

import { getCategoryById } from '@/lib/db/categories'
import { requireServerUser } from '@/lib/supabase/auth'

type CategoryPageProps = {
  params: Promise<{ id: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const user = await requireServerUser()
  const { id: categoryId } = await params
  const category = await getCategoryById({ userId: user.id, categoryId }).catch(() => null)
  if (!category) redirect('/app')
  redirect(`/app/w/${category.workflow_id}/category/${categoryId}`)
}
