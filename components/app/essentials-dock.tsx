import { listResources } from '@/lib/db/resources'
import { EssentialsDockClient } from '@/components/app/essentials-dock-client'

export async function EssentialsDock({ userId }: { userId: string }) {
  const essentials = await listResources({ userId, scope: 'pinned', limit: 16 })

  return (
    <EssentialsDockClient
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
