'use server'

import { redirect } from 'next/navigation'

import { requireServerUser } from '@/lib/supabase/auth'
import { getSiteUrl } from '@/lib/site/url'
import { createTask } from '@/lib/db/tasks'
import { createExternalLink } from '@/lib/db/external-items'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncSlackMentions } from '@/lib/integrations/slack/sync'
import { createNote } from '@/lib/db/notes'
import { syncNotionRecent } from '@/lib/integrations/notion/sync'
import { syncAsanaMyTasks } from '@/lib/integrations/asana/sync'
import { logIntegrationError } from '@/lib/integrations/error-logging'

export async function syncSlackNowAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const result = await syncSlackMentions({ userId: user.id })

  // We always redirect back; page will show latest data.
  const usp = new URLSearchParams()
  if (result.error) {
    await logIntegrationError({
      userId: user.id,
      provider: 'slack',
      stage: 'sync_button',
      error: result.error,
      details: { workflowId },
    })
    usp.set('sync', 'error')
  }
  const suffix = usp.size ? `?${usp.toString()}` : ''
  redirect(`${getSiteUrl()}/app/w/${workflowId}/inbox${suffix}`)
}

export async function syncNotionNowAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const result = await syncNotionRecent({ userId: user.id })
  const usp = new URLSearchParams()
  if (result.error) {
    await logIntegrationError({
      userId: user.id,
      provider: 'notion',
      stage: 'sync_button',
      error: result.error,
      details: { workflowId },
    })
    usp.set('sync', 'error')
  }
  const suffix = usp.size ? `?${usp.toString()}` : ''
  redirect(`${getSiteUrl()}/app/w/${workflowId}/inbox${suffix}`)
}

export async function syncAsanaNowAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const result = await syncAsanaMyTasks({ userId: user.id })
  const usp = new URLSearchParams()
  if (result.error) {
    await logIntegrationError({
      userId: user.id,
      provider: 'asana',
      stage: 'sync_button',
      error: result.error,
      details: { workflowId },
    })
    usp.set('sync', 'error')
  }
  const suffix = usp.size ? `?${usp.toString()}` : ''
  redirect(`${getSiteUrl()}/app/w/${workflowId}/inbox${suffix}`)
}

export async function convertExternalItemToTaskAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const externalItemId = String(formData.get('externalItemId') ?? '')

  if (!workflowId || !externalItemId) {
    redirect(`${getSiteUrl()}/app/w/${workflowId}/inbox`)
  }

  const supabase = await createSupabaseServerClient()
  const itemRes = await supabase
    .from('external_items')
    .select('id,title,summary,external_url')
    .eq('id', externalItemId)
    .eq('user_id', user.id)
    .single()

  if (itemRes.error) throw itemRes.error

  // Prefer the message text as the task title; fall back to channel/title.
  const title = (itemRes.data.summary ?? itemRes.data.title ?? 'Imported item').toString().slice(0, 200)
  const description = itemRes.data.summary ? String(itemRes.data.summary).slice(0, 4000) : null
  const url = itemRes.data.external_url ? String(itemRes.data.external_url).slice(0, 2048) : null

  const task = await createTask({
    userId: user.id,
    workflowId,
    title,
    description: description ?? undefined,
    url: url ?? undefined,
  })

  await createExternalLink({ userId: user.id, sourceKind: 'task', sourceId: task.id, externalItemId })

  redirect(`${getSiteUrl()}/app/w/${workflowId}`)
}

export async function convertExternalItemToNoteAction(formData: FormData) {
  const user = await requireServerUser()
  const workflowId = String(formData.get('workflowId') ?? '')
  const externalItemId = String(formData.get('externalItemId') ?? '')

  if (!workflowId || !externalItemId) {
    redirect(`${getSiteUrl()}/app/w/${workflowId}/inbox`)
  }

  const supabase = await createSupabaseServerClient()
  const itemRes = await supabase
    .from('external_items')
    .select('id,title,summary,external_url')
    .eq('id', externalItemId)
    .eq('user_id', user.id)
    .single()

  if (itemRes.error) throw itemRes.error

  const title = (itemRes.data.title ?? 'Imported item').toString().slice(0, 200)
  const body = [
    itemRes.data.external_url ? `Source: ${String(itemRes.data.external_url)}` : null,
    '',
    itemRes.data.summary ? String(itemRes.data.summary) : null,
  ]
    .filter((x) => typeof x === 'string')
    .join('\n')
    .slice(0, 20000)

  const note = await createNote({ userId: user.id, workflowId, title, body })
  await createExternalLink({ userId: user.id, sourceKind: 'note', sourceId: note.id, externalItemId })

  redirect(`${getSiteUrl()}/app/w/${workflowId}/notes/${note.id}`)
}
