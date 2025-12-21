import { AppSidebar } from '@/components/app/app-sidebar'
import { requireActiveEntitlement } from '@/lib/billing/entitlements'
import { requireServerUser } from '@/lib/supabase/auth'

export default async function GatedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requireServerUser()
  await requireActiveEntitlement(user.id)

  return (
    <div className="grid gap-8 sm:grid-cols-[15rem_minmax(0,1fr)]">
      <AppSidebar userId={user.id} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
