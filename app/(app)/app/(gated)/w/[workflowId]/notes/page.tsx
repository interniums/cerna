import Link from 'next/link'

import { requireServerUser } from '@/lib/supabase/auth'
import { listNotes } from '@/lib/db/notes'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormSubmitButton } from '@/components/forms/form-submit-button'
import { createNoteAction } from '@/app/(app)/app/(gated)/w/[workflowId]/notes/actions'

type NotesPageProps = {
  params: Promise<{ workflowId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

export default async function NotesPage({ params, searchParams }: NotesPageProps) {
  const user = await requireServerUser()
  const { workflowId } = await params
  const sp = (await searchParams) ?? {}
  const q = firstString(sp.q) ?? ''

  const notes = await listNotes({ userId: user.id, workflowId, q, limit: 100 })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 pt-1">
        <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground">Cerna-native notes for this workflow.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href={`/app/w/${workflowId}`}>Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pt-0 pb-6">
        <div className="grid gap-4">
          <Card className="p-4">
            <form method="GET" action={`/app/w/${workflowId}/notes`} className="grid gap-2 sm:flex sm:items-center sm:gap-2">
              <Input name="q" placeholder="Search notes…" defaultValue={q} maxLength={200} />
              <div className="flex gap-2 sm:shrink-0">
                <Button type="submit" variant="secondary">
                  Search
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/app/w/${workflowId}/notes`}>Clear</Link>
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-4">
            <form action={createNoteAction} className="grid gap-3">
              <input type="hidden" name="workflowId" value={workflowId} />
              <Input name="title" placeholder="New note title…" maxLength={200} />
              <Textarea name="body" placeholder="Write something…" rows={4} />
              <div className="flex justify-end">
                <FormSubmitButton idleText="Create note" pendingText="Creating…" />
              </div>
            </form>
          </Card>

          <div className="grid gap-3">
            {notes.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              </Card>
            ) : (
              notes.map((n) => (
                <Card key={n.id} className="p-4">
                  <div className="grid gap-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(n.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/app/w/${workflowId}/notes/${n.id}`}>Open</Link>
                      </Button>
                    </div>
                    {n.body ? <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{n.body}</p> : null}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


