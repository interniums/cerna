import { AppSidebar } from '@/components/app/app-sidebar'
import { EssentialsDock } from '@/components/app/essentials-dock'
import { UndoToast } from '@/features/resources/components/undo-toast'
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
    <div className="grid h-full min-h-0 gap-8 sm:grid-cols-[minmax(0,1fr)_15rem_minmax(0,clamp(28rem,60vw,56rem))_minmax(0,1fr)]">
      <div className="hidden sm:block" aria-hidden="true" />
      <AppSidebar userId={user.id} />
      <div className="flex h-full min-h-0 flex-col py-6">
        <div className="mb-6 pr-4">
          <EssentialsDock userId={user.id} />
        </div>
        <UndoToast />
        {children}
      </div>
      <div className="hidden sm:block" aria-hidden="true" />
    </div>
  )
}
