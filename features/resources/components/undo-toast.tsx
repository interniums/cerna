'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { restoreResourceAction } from '@/features/resources/actions'

function removeUndoParam(pathname: string, searchParams: URLSearchParams) {
  const sp = new URLSearchParams(searchParams)
  sp.delete('undo')
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function UndoToast() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [undoResourceId, setUndoResourceId] = useState<string | null>(null)
  const lastSeenRef = useRef<string | null>(null)
  const toastIdRef = useRef<string | number | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  // Capture the undo id once and immediately clean the URL so we don't repeat on refresh.
  useEffect(() => {
    const id = searchParams.get('undo')
    if (!id) return
    if (lastSeenRef.current === id) return
    lastSeenRef.current = id

    setUndoResourceId(id)
    router.replace(removeUndoParam(pathname, new URLSearchParams(searchParams)), { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (!undoResourceId) return

    const handleUndo = () => {
      // Best-effort: submit a server action form (works even from a client component).
      formRef.current?.requestSubmit()
      if (toastIdRef.current != null) toast.dismiss(toastIdRef.current)
    }

    toastIdRef.current = toast('Resource deleted.', {
      duration: 10_000,
      action: { label: 'Undo', onClick: handleUndo },
    })

    const t = window.setTimeout(() => setUndoResourceId(null), 10_500)
    return () => window.clearTimeout(t)
  }, [undoResourceId])

  if (!undoResourceId) return null

  return (
    <form ref={formRef} action={restoreResourceAction.bind(null, undoResourceId)} className="sr-only" aria-hidden="true">
      <button type="submit">Undo delete</button>
    </form>
  )
}


