'use client'

import { useEffect, useRef } from 'react'

import { recordAnchorEventAction } from '@/features/instrumentation/actions'

export function PageViewTracker({
  workflowId,
  name,
}: {
  workflowId: string
  name: 'view_dashboard' | 'view_command_center' | 'view_morning'
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true
    formRef.current?.requestSubmit()
  }, [])

  return (
    <form ref={formRef} action={recordAnchorEventAction} className="sr-only" aria-hidden="true">
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="name" value={name} />
      <button type="submit">Record view</button>
    </form>
  )
}


