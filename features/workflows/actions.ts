'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

import { workflowsTag } from '@/lib/cache/tags'
import { CreateWorkflowSchema, createWorkflow } from '@/lib/db/workflows'
import { requireServerUser } from '@/lib/supabase/auth'

export type WorkflowActionState = { ok: true } | { ok: false; message: string }

const tagRevalidateProfile = { expire: 0 } as const

function safeMessage(input: unknown) {
  return typeof input === 'string' ? input : ''
}

function mapWorkflowWriteErrorToMessage(error: unknown): string {
  const raw = (error && typeof error === 'object' && 'message' in error ? safeMessage((error as { message?: unknown }).message) : '')
    .toLowerCase()

  if (raw.includes('duplicate') || raw.includes('unique') || raw.includes('workflows_user_name_unique')) {
    return 'That workflow name is already used.'
  }

  return 'Couldn’t save changes. Try again.'
}

const CreateWorkflowActionSchema = CreateWorkflowSchema.extend({
  theme: z.enum(['work', 'side', 'learning']).optional(),
})

export async function createWorkflowAction(
  _prev: WorkflowActionState,
  formData: FormData
): Promise<WorkflowActionState> {
  const parsed = CreateWorkflowActionSchema.safeParse({
    name: formData.get('name'),
    theme: formData.get('theme') || undefined,
  })

  if (!parsed.success) return { ok: false, message: 'Enter a workflow name.' }

  const user = await requireServerUser()

  try {
    await createWorkflow({ userId: user.id, name: parsed.data.name, theme: parsed.data.theme })
    revalidateTag(workflowsTag(user.id), tagRevalidateProfile)
    return { ok: true }
  } catch (error) {
    return { ok: false, message: mapWorkflowWriteErrorToMessage(error) }
  }
}


