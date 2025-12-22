import type { Metadata } from 'next'

import { SiteFooter } from '@/components/site/site-footer'
import { MarketingHeader } from '@/components/site/marketing-header'

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-dvh">
      <MarketingHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
