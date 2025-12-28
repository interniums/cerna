'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

import { endFocusSessionAction, startFocusSessionAction } from '@/features/focus/actions'

type PomodoroActive = {
  sessionId: string
  taskId: string | null
  status: 'running' | 'paused' | 'finishing'
  /** When running */
  targetEndMs: number | null
  /** When paused/finishing (and as a fallback snapshot) */
  secondsLeft: number
  startedAtMs: number
}

export type PomodoroStore = {
  version: 1
  workflowId: string
  plannedDurationSeconds: number
  active: PomodoroActive | null
}

const DEFAULT_PLANNED_SECONDS = 25 * 60
const STORAGE_PREFIX = 'cerna:pomodoro:v1:'
const COOKIE_PREFIX = 'cerna-pomodoro-v1-'
const EVENT_NAME = 'cerna:pomodoro'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function keyFor(workflowId: string) {
  return `${STORAGE_PREFIX}${workflowId}`
}

function cookieKeyFor(workflowId: string) {
  return `${COOKIE_PREFIX}${workflowId}`
}

function writePomodoroCookie(next: PomodoroStore) {
  if (typeof window === 'undefined') return
  const name = cookieKeyFor(next.workflowId)
  try {
    if (!next.active) {
      // Clear cookie when not active to avoid stale UI on reload.
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
      return
    }

    // Keep it small: only what's needed to render the countdown badge on first paint.
    const payload = {
      v: 1 as const,
      plannedDurationSeconds: next.plannedDurationSeconds,
      active: {
        status: next.active.status,
        targetEndMs: next.active.targetEndMs,
        secondsLeft: next.active.secondsLeft,
      },
    }
    const encoded = encodeURIComponent(JSON.stringify(payload))
    document.cookie = `${name}=${encoded}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`
  } catch {
    // Ignore cookie errors
  }
}

function defaultStore(workflowId: string): PomodoroStore {
  return { version: 1, workflowId, plannedDurationSeconds: DEFAULT_PLANNED_SECONDS, active: null }
}

// `useSyncExternalStore` requires `getSnapshot()` to return a cached value (stable reference)
// until the external store actually changes. We cache by raw localStorage string per workflow.
const storeCache = new Map<string, { raw: string | null; parsed: PomodoroStore }>()

function safeParseStore(value: string | null, workflowId: string): PomodoroStore | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Partial<PomodoroStore>
    if (obj.version !== 1) return null
    if (obj.workflowId !== workflowId) return null
    const planned =
      typeof obj.plannedDurationSeconds === 'number' && Number.isFinite(obj.plannedDurationSeconds)
        ? obj.plannedDurationSeconds
        : DEFAULT_PLANNED_SECONDS
    const active = obj.active as PomodoroActive | null | undefined
    if (active == null) {
      return { version: 1, workflowId, plannedDurationSeconds: planned, active: null }
    }
    if (typeof active !== 'object') return null
    if (typeof active.sessionId !== 'string') return null
    const statusOk = active.status === 'running' || active.status === 'paused' || active.status === 'finishing'
    if (!statusOk) return null
    const targetEndMs =
      active.targetEndMs == null
        ? null
        : typeof active.targetEndMs === 'number' && Number.isFinite(active.targetEndMs)
        ? active.targetEndMs
        : null
    const secondsLeft =
      typeof active.secondsLeft === 'number' && Number.isFinite(active.secondsLeft)
        ? Math.max(0, Math.floor(active.secondsLeft))
        : 0
    const startedAtMs =
      typeof active.startedAtMs === 'number' && Number.isFinite(active.startedAtMs) ? active.startedAtMs : Date.now()
    const taskId = typeof active.taskId === 'string' ? active.taskId : null
    return {
      version: 1,
      workflowId,
      plannedDurationSeconds: Math.max(60, Math.floor(planned)),
      active: {
        sessionId: active.sessionId,
        taskId,
        status: active.status,
        targetEndMs,
        secondsLeft,
        startedAtMs,
      },
    }
  } catch {
    return null
  }
}

function readStore(workflowId: string): PomodoroStore {
  if (typeof window === 'undefined') {
    return defaultStore(workflowId)
  }
  const raw = window.localStorage.getItem(keyFor(workflowId))
  return (
    safeParseStore(raw, workflowId) ?? {
      version: 1,
      workflowId,
      plannedDurationSeconds: DEFAULT_PLANNED_SECONDS,
      active: null,
    }
  )
}

function readStoreCached(workflowId: string): PomodoroStore {
  if (typeof window === 'undefined') {
    // Keep a stable reference on the server too (per workflow).
    const cached = storeCache.get(workflowId)
    if (cached) return cached.parsed
    const d = defaultStore(workflowId)
    storeCache.set(workflowId, { raw: null, parsed: d })
    return d
  }

  const raw = window.localStorage.getItem(keyFor(workflowId))
  const cached = storeCache.get(workflowId)
  if (cached && cached.raw === raw) return cached.parsed

  const parsed = safeParseStore(raw, workflowId) ?? defaultStore(workflowId)
  storeCache.set(workflowId, { raw, parsed })
  return parsed
}

function writeStore(next: PomodoroStore) {
  if (typeof window === 'undefined') return
  const raw = JSON.stringify(next)
  window.localStorage.setItem(keyFor(next.workflowId), raw)
  storeCache.set(next.workflowId, { raw, parsed: next })
  writePomodoroCookie(next)
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { workflowId: next.workflowId } }))
}

function ceilSecondsLeftFromTarget(targetEndMs: number | null) {
  if (!targetEndMs) return 0
  return Math.max(0, Math.ceil((targetEndMs - Date.now()) / 1000))
}

function playTone(frequencyHz: number, durationMs: number) {
  if (typeof window === 'undefined') return
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return

  const ctx = new AudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequencyHz
  gain.gain.value = 0.02
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000)
  osc.onended = () => {
    try {
      void ctx.close()
    } catch {
      // noop
    }
  }
}

export function playPomodoroStartSound() {
  // short bright chirp
  playTone(880, 140)
}

export function playPomodoroEndSound() {
  // two beeps
  playTone(660, 140)
  window.setTimeout(() => playTone(660, 140), 190)
}

export function formatClock(secondsTotal: number) {
  const s = Math.max(0, Math.floor(secondsTotal))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function usePomodoro(workflowId: string) {
  const getSnapshot = useCallback(() => readStoreCached(workflowId), [workflowId])
  const serverSnapshot = useMemo(() => defaultStore(workflowId), [workflowId])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') return () => {}

      const onCustom = (e: Event) => {
        const ce = e as CustomEvent<{ workflowId?: string }>
        if (ce.detail?.workflowId !== workflowId) return
        onStoreChange()
      }
      const onStorage = (e: StorageEvent) => {
        if (e.key !== keyFor(workflowId)) return
        onStoreChange()
      }

      // Re-render while running so the countdown updates (store itself holds a fixed targetEndMs).
      const interval = window.setInterval(() => {
        const s = readStoreCached(workflowId)
        if (s.active?.status === 'running') onStoreChange()
      }, 250)

      window.addEventListener(EVENT_NAME, onCustom)
      window.addEventListener('storage', onStorage)
      return () => {
        window.clearInterval(interval)
        window.removeEventListener(EVENT_NAME, onCustom)
        window.removeEventListener('storage', onStorage)
      }
    },
    [workflowId]
  )

  const store = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot)

  // Keep the SSR-readable cookie in sync even if the session started before we introduced cookies
  // (i.e., only localStorage has the active session).
  useEffect(() => {
    writePomodoroCookie(store)
  }, [store])

  const secondsLeft = useMemo(() => {
    const active = store.active
    if (!active) return store.plannedDurationSeconds
    if (active.status === 'running') return ceilSecondsLeftFromTarget(active.targetEndMs)
    return active.secondsLeft
  }, [store.active, store.plannedDurationSeconds])

  const setPlannedDurationSeconds = useCallback(
    (planned: number) => {
      const nextPlanned = Math.max(60, Math.min(6 * 60 * 60, Math.floor(planned)))
      const next: PomodoroStore = { ...readStore(workflowId), plannedDurationSeconds: nextPlanned }
      writeStore(next)
    },
    [workflowId]
  )

  const start = useCallback(
    async ({ taskId, durationSeconds }: { taskId: string | null; durationSeconds: number }) => {
      const existing = readStore(workflowId)
      if (existing.active) return { ok: false as const, message: 'Pomodoro is already running.' }

      const planned = Math.max(60, Math.min(6 * 60 * 60, Math.floor(durationSeconds)))
      const formData = new FormData()
      formData.set('workflowId', workflowId)
      if (taskId) formData.set('taskId', taskId)

      const res = await startFocusSessionAction({ ok: false, message: '' }, formData)
      if (!res.ok || !res.sessionId) {
        return { ok: false as const, message: !res.ok ? res.message : 'Couldn’t start focus. Try again.' }
      }

      const now = Date.now()
      const next: PomodoroStore = {
        version: 1,
        workflowId,
        plannedDurationSeconds: planned,
        active: {
          sessionId: res.sessionId,
          taskId: taskId ?? null,
          status: 'running',
          targetEndMs: now + planned * 1000,
          secondsLeft: planned,
          startedAtMs: now,
        },
      }
      writeStore(next)
      return { ok: true as const }
    },
    [workflowId]
  )

  const pause = useCallback(() => {
    const current = readStore(workflowId)
    const active = current.active
    if (!active || active.status !== 'running') return
    const remaining = ceilSecondsLeftFromTarget(active.targetEndMs)
    const next: PomodoroStore = {
      ...current,
      active: { ...active, status: 'paused', targetEndMs: null, secondsLeft: remaining },
    }
    writeStore(next)
  }, [workflowId])

  const resume = useCallback(() => {
    const current = readStore(workflowId)
    const active = current.active
    if (!active || active.status !== 'paused') return
    const now = Date.now()
    const next: PomodoroStore = {
      ...current,
      active: { ...active, status: 'running', targetEndMs: now + active.secondsLeft * 1000 },
    }
    writeStore(next)
  }, [workflowId])

  const stop = useCallback(
    async ({ status }: { status: 'completed' | 'cancelled' }) => {
      const current = readStore(workflowId)
      const active = current.active
      if (!active) return { ok: true as const }

      // Mark as finishing to prevent double-submit loops.
      const finishing: PomodoroStore = {
        ...current,
        active: { ...active, status: 'finishing', targetEndMs: null, secondsLeft: 0 },
      }
      writeStore(finishing)

      const formData = new FormData()
      formData.set('sessionId', active.sessionId)
      formData.set('status', status)
      const res = await endFocusSessionAction({ ok: false, message: '' }, formData)
      if (!res.ok) {
        // Keep it paused at 0 so user can retry via Stop.
        const fallback: PomodoroStore = {
          ...current,
          active: { ...active, status: 'paused', targetEndMs: null, secondsLeft: 0 },
        }
        writeStore(fallback)
        return { ok: false as const, message: res.message }
      }

      const cleared: PomodoroStore = { ...current, active: null }
      writeStore(cleared)
      return { ok: true as const }
    },
    [workflowId]
  )

  const isActive = Boolean(store.active)
  const isRunning = store.active?.status === 'running'

  return {
    store,
    isActive,
    isRunning,
    secondsLeft,
    setPlannedDurationSeconds,
    start,
    pause,
    resume,
    stop,
  }
}

export function usePomodoroBadge(workflowId: string) {
  const { isActive, isRunning, secondsLeft, stop, store } = usePomodoro(workflowId)
  const didPlayEndRef = useRef(false)
  const completionInFlightRef = useRef(false)

  // Auto-complete even if the modal is closed.
  useEffect(() => {
    const active = store.active
    if (!active) {
      didPlayEndRef.current = false
      completionInFlightRef.current = false
      return
    }
    if (active.status !== 'running') return
    if (secondsLeft > 0) return
    if (completionInFlightRef.current) return

    completionInFlightRef.current = true
    if (!didPlayEndRef.current) {
      didPlayEndRef.current = true
      try {
        playPomodoroEndSound()
      } catch {
        // noop
      }
    }
    void stop({ status: 'completed' }).finally(() => {
      completionInFlightRef.current = false
    })
  }, [secondsLeft, stop, store.active])

  return {
    isActive,
    isRunning,
    secondsLeft,
    label: isActive ? formatClock(secondsLeft) : null,
  }
}
