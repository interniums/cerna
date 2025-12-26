import type { Task } from '@/lib/db/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskRow } from '@/features/tasks/components/task-row'

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function TaskList({ openTasks, doneTasks }: { openTasks: Task[]; doneTasks: Task[] }) {
  const hasAny = openTasks.length > 0 || doneTasks.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Tasks</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!hasAny ? <EmptyState message="No tasks yet." /> : null}

        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="grid gap-2">
            {openTasks.length === 0 ? <EmptyState message="All clear." /> : openTasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </TabsContent>

          <TabsContent value="done" className="grid gap-2">
            {doneTasks.length === 0 ? <EmptyState message="Nothing completed yet." /> : doneTasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}


