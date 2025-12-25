'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Link2 } from 'lucide-react'
import { toast } from 'sonner'

import type { Category } from '@/lib/db/categories'
import type { ResourceActionState } from '@/features/resources/actions'
import { addEssentialStateAction, createEssentialResourceAction } from '@/features/resources/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormSubmitButton } from '@/components/forms/form-submit-button'

type SpotlightResource = {
  id: string
  url: string
  title: string | null
  favicon_url: string | null
  is_essential: boolean
}

const initialState: ResourceActionState = { ok: false, message: '' }

function getPrimaryText(r: { title: string | null; url: string }) {
  return r.title?.trim() ? r.title : r.url
}

function getHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0] || rawUrl
  }
}

function getFaviconServiceUrl(rawUrl: string) {
  const host = getHost(rawUrl)
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`
}

function SelectCategory({ categories }: { categories: Category[] }) {
  const hasCategories = categories.length > 0
  return (
    <div className="grid gap-2">
      <Label htmlFor="essential-category" className="text-muted-foreground">
        Section
      </Label>
      <div className="relative">
        <select
          id="essential-category"
          name="categoryId"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full appearance-none rounded-md border bg-transparent py-1 pl-3 pr-12 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          defaultValue=""
        >
          <option value="">{hasCategories ? 'Uncategorized' : 'Uncategorized (no sections yet)'}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  )
}

function AddNewTab({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const [state, formAction] = useActionState(createEssentialResourceAction, initialState)
  const didCompleteRef = useRef(false)

  useEffect(() => {
    if (didCompleteRef.current) return
    if (!state.ok) return
    didCompleteRef.current = true
    toast.success('Added to essentials.')
    onDone()
  }, [onDone, state.ok])

  return (
    <form action={formAction} className="flex h-full min-h-0 flex-col gap-4">
      {/* Keep the first field fixed so it aligns with the "Choose existing" search field (no horizontal jump). */}
      <div className="grid gap-2">
        <Label htmlFor="essential-url" className="text-muted-foreground">
          URL
        </Label>
        <Input id="essential-url" name="url" placeholder="https://…" inputMode="url" autoComplete="off" required />
      </div>

      <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto pr-0.5">
        <SelectCategory categories={categories} />

        <div className="grid gap-2">
          <Label htmlFor="essential-title" className="text-muted-foreground">
            Title (optional)
          </Label>
          <Input id="essential-title" name="title" placeholder="Notion workspace" autoComplete="off" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="essential-notes" className="text-muted-foreground">
            Notes (optional)
          </Label>
          <Textarea id="essential-notes" name="notes" placeholder="Why this matters…" rows={4} />
        </div>

        {!state.ok && state.message ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end">
        <FormSubmitButton idleText="Add to essentials" pendingText="Adding…" />
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Close
          </Button>
        </DialogClose>
      </div>
    </form>
  )
}

function ChooseExistingTab({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SpotlightResource[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const inFlight = useRef<AbortController | null>(null)

  const [state, formAction] = useActionState(addEssentialStateAction, initialState)
  const didCompleteRef = useRef(false)

  useEffect(() => {
    if (didCompleteRef.current) return
    if (!state.ok) return
    didCompleteRef.current = true
    toast.success('Added to essentials.')
    onDone()
  }, [onDone, state.ok])

  const trimmed = query.trim()
  const limit = trimmed ? 30 : 12

  useEffect(() => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    setStatus('loading')
    void fetch('/api/resources/spotlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ q: trimmed, limit }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Bad response')
        const json = (await res.json()) as { ok: boolean; items?: SpotlightResource[] }
        setItems(json.items ?? [])
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setItems([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [limit, trimmed])

  const list = useMemo(() => {
    const q = trimmed.toLowerCase()
    if (!q) return items
    return items.filter((r) => getPrimaryText(r).toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
  }, [items, trimmed])

  const nonEssentialList = useMemo(() => list.filter((r) => !r.is_essential), [list])

  function ResultsList({ rows }: { rows: SpotlightResource[] }) {
    const { pending } = useFormStatus()
    return (
      <div
        className={
          pending
            ? 'min-h-0 flex-1 overflow-hidden rounded-md border border-border/60 pointer-events-none'
            : 'min-h-0 flex-1 overflow-y-auto rounded-md border border-border/60'
        }
        aria-busy={pending}
      >
        {status === 'error' ? (
          <p className="p-3 text-sm text-muted-foreground">Couldn’t load resources.</p>
        ) : status === 'ready' && rows.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No matches.</p>
        ) : (
          <div className="grid">
            {rows.map((r) => (
              <button
                key={r.id}
                type="submit"
                name="resourceId"
                value={r.id}
                disabled={pending}
                aria-disabled={pending}
                className="hover:bg-accent hover:text-accent-foreground disabled:opacity-60 flex w-full items-center gap-3 border-b border-border/60 p-3 text-left last:border-b-0"
              >
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {r.favicon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.favicon_url} alt="" className="size-5" loading="lazy" referrerPolicy="no-referrer" />
                  ) : r.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getFaviconServiceUrl(r.url)}
                      alt=""
                      className="size-5"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{getPrimaryText(r)}</p>
                  <p className="truncate text-xs text-muted-foreground">{getHost(r.url)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="essential-search" className="text-muted-foreground">
          Search your resources
        </Label>
        <Input
          id="essential-search"
          placeholder="Search…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <form action={formAction} className="flex flex-1 min-h-0 flex-col gap-4">
        {!state.ok && state.message ? (
          <p className="text-sm text-destructive" role="status" aria-live="polite">
            {state.message}
          </p>
        ) : null}

        <ResultsList rows={nonEssentialList} />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
        </div>
      </form>
    </div>
  )
}

export function EssentialsAddDialog({
  categories,
  triggerLabel = 'Add to essentials',
  trigger,
}: {
  categories: Category[]
  triggerLabel?: string
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function closeAndRefresh() {
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={triggerLabel}>
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:h-[600px] sm:max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add essentials</DialogTitle>
          <DialogDescription className="sr-only">Add a resource to your essentials dock.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="choose" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger
              value="choose"
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:border-white/15"
            >
              Choose existing
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:border-white/15"
            >
              Add new
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 pt-4">
          <TabsContent value="choose" className="h-full">
            <ChooseExistingTab onDone={closeAndRefresh} />
          </TabsContent>
          <TabsContent value="new" className="h-full">
            <AddNewTab categories={categories} onDone={closeAndRefresh} />
          </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}


