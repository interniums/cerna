import { listCategories } from '@/lib/db/categories'
import { listEssentialsResources } from '@/lib/db/resources'
import { EssentialsDockClient } from '@/components/app/essentials-dock-client'
import { ensureDefaultEssentials } from '@/lib/db/resources'
import { cookies } from 'next/headers'

const POMODORO_COOKIE_PREFIX = 'cerna-pomodoro-v1-'

function formatClock(secondsTotal: number) {
  const s = Math.max(0, Math.floor(secondsTotal))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function readPomodoroBadgeFromCookie(raw: string | undefined) {
  if (!raw) return { isActive: false, label: null }
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as unknown
    if (!parsed || typeof parsed !== 'object') return { isActive: false, label: null }
    const obj = parsed as { v?: unknown; active?: unknown }
    if (obj.v !== 1) return { isActive: false, label: null }
    const active = obj.active as { status?: unknown; targetEndMs?: unknown; secondsLeft?: unknown } | null | undefined
    if (!active) return { isActive: false, label: null }

    const status = active.status
    const targetEndMs =
      typeof active.targetEndMs === 'number' && Number.isFinite(active.targetEndMs) ? active.targetEndMs : null
    const secondsLeft =
      typeof active.secondsLeft === 'number' && Number.isFinite(active.secondsLeft)
        ? Math.max(0, Math.floor(active.secondsLeft))
        : 0

    const computed =
      status === 'running' && targetEndMs != null
        ? Math.max(0, Math.ceil((targetEndMs - Date.now()) / 1000))
        : secondsLeft

    return { isActive: true, label: formatClock(computed) }
  } catch {
    return { isActive: false, label: null }
  }
}

export async function EssentialsDock({ userId, workflowId }: { userId: string; workflowId: string }) {
  await ensureDefaultEssentials({ userId, workflowId })
  const categories = await listCategories({ userId, workflowId })
  const essentials = await listEssentialsResources({ userId, workflowId, limit: 16 })

  // Next.js 16 `cookies()` is async in RSC/Turbopack.
  const cookieStore = await cookies()
  const pomodoroCookie = cookieStore.get(`${POMODORO_COOKIE_PREFIX}${workflowId}`)?.value
  const initialPomodoroBadge = readPomodoroBadgeFromCookie(pomodoroCookie)

  return (
    <EssentialsDockClient
      categories={categories}
      workflowId={workflowId}
      initialPomodoroBadge={initialPomodoroBadge}
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
