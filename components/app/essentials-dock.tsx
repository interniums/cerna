import { listCategories } from '@/lib/db/categories'
import { listEssentialsResources } from '@/lib/db/resources'
import { EssentialsDockClient } from '@/components/app/essentials-dock-client'
import { ensureDefaultEssentials } from '@/lib/db/resources'

export async function EssentialsDock({ userId }: { userId: string }) {
  await ensureDefaultEssentials({ userId })
  const categories = await listCategories(userId)
  const essentials = await listEssentialsResources({ userId, limit: 16 })

  return (
    <EssentialsDockClient
      categories={categories}
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
