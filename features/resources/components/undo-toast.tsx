'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { restoreResourceAction } from '@/features/resources/actions'

type ToastState = 'idle' | 'undoing' | 'restored'

function UndoToastContent({ state, onUndo }: { state: ToastState; onUndo: () => void }) {
  if (state === 'restored') {
    return (
      <div className="flex w-[356px] items-center gap-2 rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg">
        <span className="text-sm">Restored.</span>
      </div>
    )
  }

  return (
    <div className="flex w-[356px] items-center justify-between gap-2 rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg">
      <span className="text-sm">Resource deleted.</span>
      <button
        type="button"
        onClick={onUndo}
        disabled={state === 'undoing'}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70"
      >
        {state === 'undoing' ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Undoing…
          </>
        ) : (
          'Undo'
        )}
      </button>
    </div>
  )
}

export function UndoToast() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const lastSeenRef = useRef<string | null>(null)
  const toastIdRef = useRef<string | number | null>(null)
  const isProcessingRef = useRef(false)
  const showToastRef = useRef<(state: ToastState) => void>(() => {})

  const undoResourceId = searchParams.get('undo')

  const showToast = (state: ToastState) => {
    // Dismiss existing toast first
    if (toastIdRef.current != null) {
      toast.dismiss(toastIdRef.current)
    }

    const handleClick = () => {
      if (isProcessingRef.current) return
      isProcessingRef.current = true

      // Show undoing state immediately
      showToastRef.current('undoing')

      void restoreResourceAction(undoResourceId!)
        .then(() => {
          router.refresh()
          showToastRef.current('restored')
          // Auto-dismiss after showing "Restored." briefly
          setTimeout(() => {
            if (toastIdRef.current != null) toast.dismiss(toastIdRef.current)
          }, 1500)
        })
        .catch(() => {
          toast("Couldn't undo. Try again.")
          isProcessingRef.current = false
          showToastRef.current('idle')
        })
    }

    toastIdRef.current = toast.custom(() => <UndoToastContent state={state} onUndo={handleClick} />, {
      duration: state === 'undoing' || state === 'restored' ? Infinity : 10_000,
    })
  }

  // Keep ref in sync
  useEffect(() => {
    showToastRef.current = showToast
  })

  useEffect(() => {
    if (!undoResourceId) return
    if (lastSeenRef.current === undoResourceId) return

    // Persist across refresh so we don't repeat the toast for the same id.
    const storageKey = 'cerna.undo.lastSeen'
    try {
      if (window.sessionStorage.getItem(storageKey) === undoResourceId) return
      window.sessionStorage.setItem(storageKey, undoResourceId)
    } catch {
      // Ignore storage failures (e.g. blocked storage).
    }

    lastSeenRef.current = undoResourceId
    isProcessingRef.current = false
    showToastRef.current('idle')
  }, [undoResourceId])

  return null
}
