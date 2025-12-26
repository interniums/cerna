'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { restoreResourceAction } from '@/features/resources/actions'

export function UndoToast() {
  const searchParams = useSearchParams()

  const lastSeenRef = useRef<string | null>(null)
  const toastIdRef = useRef<string | number | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  const undoResourceId = searchParams.get('undo')

  const handleUndo = useCallback(() => {
    // Best-effort: submit a server action form (works even from a client component).
    formRef.current?.requestSubmit()
    if (toastIdRef.current != null) toast.dismiss(toastIdRef.current)
  }, [])

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

    toastIdRef.current = toast('Resource deleted.', {
      duration: 10_000,
      action: { label: 'Undo', onClick: handleUndo },
    })
  }, [handleUndo, undoResourceId])

  if (!undoResourceId) return null

  return (
    <form ref={formRef} action={restoreResourceAction.bind(null, undoResourceId)} className="sr-only" aria-hidden="true">
      <button type="submit">Undo delete</button>
    </form>
  )
}


