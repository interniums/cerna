import { listCategories } from '@/lib/db/categories'
import { listEssentialsResources } from '@/lib/db/resources'
import { EssentialsDockClient } from '@/components/app/essentials-dock-client'
import { ensureDefaultEssentials } from '@/lib/db/resources'

export async function EssentialsDock({ userId, workflowId }: { userId: string; workflowId: string }) {
  await ensureDefaultEssentials({ userId, workflowId })
  const categories = await listCategories({ userId, workflowId })
  const essentials = await listEssentialsResources({ userId, workflowId, limit: 16 })

  return (
    <EssentialsDockClient
      categories={categories}
      workflowId={workflowId}
      essentials={essentials.map((r) => ({
        id: r.id,
        url: r.url,
        title: r.title,
        favicon_url: r.favicon_url,
        image_url: r.image_url,
      }))}
    />
  )
}
