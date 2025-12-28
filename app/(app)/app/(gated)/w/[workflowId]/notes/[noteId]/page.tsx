import Link from 'next/link'

import { requireServerUser } from '@/lib/supabase/auth'
import { getNoteById } from '@/lib/db/notes'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { deleteNoteAction, updateNoteAction } from '@/app/(app)/app/(gated)/w/[workflowId]/notes/actions'

type NotePageProps = {
  params: Promise<{ workflowId: string; noteId: string }>
}

export default async function NotePage({ params }: NotePageProps) {
  const user = await requireServerUser()
  const { workflowId, noteId } = await params
  const note = await getNoteById({ userId: user.id, noteId })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 pt-1">
        <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Note</h1>
            <p className="text-sm text-muted-foreground">Last updated {new Date(note.updated_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/w/${workflowId}/notes`}>Back to notes</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/app/w/${workflowId}`}>Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pt-0 pb-6">
        <div className="grid gap-3">
          <Card className="p-4">
            <div className="grid gap-3">
              <form action={updateNoteAction} className="grid gap-3">
                <input type="hidden" name="workflowId" value={workflowId} />
                <input type="hidden" name="noteId" value={note.id} />
                <Input name="title" defaultValue={note.title} maxLength={200} />
                <Textarea name="body" defaultValue={note.body ?? ''} rows={14} />
                <div className="flex justify-end">
                  <FormSubmitButton idleText="Save" pendingText="Saving…" />
                </div>
              </form>

              <form action={deleteNoteAction} className="flex justify-start">
                <input type="hidden" name="workflowId" value={workflowId} />
                <input type="hidden" name="noteId" value={note.id} />
                <FormSubmitButton idleText="Delete" pendingText="Deleting…" variant="secondary" />
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}


