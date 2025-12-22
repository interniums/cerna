import { SiteHeader } from '@/components/site/site-header'
import { getServerUser } from '@/lib/supabase/auth'

export async function MarketingHeader() {
  const user = await getServerUser()

  return (
    <SiteHeader
      logoHref={user ? '/app' : '/'}
      primaryCtaHref={user ? '/app' : '/signup'}
      primaryCtaLabel={user ? 'Open app' : 'Get Cerna'}
    />
  )
}
