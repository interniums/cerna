import { requireActiveEntitlement } from '@/lib/billing/entitlements'
import { requireServerUser } from '@/lib/supabase/auth'

export default async function GatedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requireServerUser()
  await requireActiveEntitlement(user.id)

  return children
}
