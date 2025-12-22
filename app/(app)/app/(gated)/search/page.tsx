import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ResourceList } from '@/features/resources/components/resource-list'
import { searchResources } from '@/lib/search/resources-search'
import { requireServerUser } from '@/lib/supabase/auth'

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await requireServerUser()
  const params = (await searchParams) ?? {}
  const q = (params.q ?? '').trim()

  const results = q ? await searchResources({ userId: user.id, query: q }) : []

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      </div>

      <form action="/app/search" method="get" className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={q} placeholder="Search your saved resources…" autoComplete="off" />
        <Button type="submit" className="sm:w-28">
          Search
        </Button>
      </form>

      {!q ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Try searching for a title, a keyword, or a note.</p>
        </Card>
      ) : (
        <ResourceList resources={results} />
      )}
    </div>
  )
}
