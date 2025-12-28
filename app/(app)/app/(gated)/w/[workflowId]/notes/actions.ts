'use server'

import { redirect } from 'next/navigation'

import { requireServerUser } from '@/lib/supabase/auth'
import { getSiteUrl } from '@/lib/site/url'
import { createNote, softDeleteNote, updateNote } from '@/lib/db/notes'

export async function createNoteAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '')

  const note = await createNote({ userId: user.id, workflowId, title: title || 'Untitled', body })
  redirect(`${getSiteUrl()}/app/w/${workflowId}/notes/${note.id}`)
}

export async function updateNoteAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const noteId = String(formData.get('noteId') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '')

  await updateNote({ userId: user.id, noteId, title: title || 'Untitled', body })
  redirect(`${getSiteUrl()}/app/w/${workflowId}/notes/${noteId}`)
}

export async function deleteNoteAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const noteId = String(formData.get('noteId') ?? '')
  if (!workflowId || !noteId) redirect(`${getSiteUrl()}/app/w/${workflowId}/notes`)

  await softDeleteNote({ userId: user.id, noteId })
  redirect(`${getSiteUrl()}/app/w/${workflowId}/notes`)
}


