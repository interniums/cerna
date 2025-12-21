import { restoreResourceAction } from '@/features/resources/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function UndoBanner({ resourceId }: { resourceId: string }) {
  return (
    <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Resource deleted. You can undo this.</p>
      <form action={restoreResourceAction.bind(null, resourceId)}>
        <Button size="sm" variant="secondary">
          Undo
        </Button>
      </form>
    </Card>
  )
}
