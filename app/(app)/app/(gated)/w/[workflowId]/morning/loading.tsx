import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 pr-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-52" />
      </div>

      <div className="pr-4">
        <Separator />
      </div>

      <div className="pr-4 pt-4 pb-6">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="grid min-w-0 gap-6">
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}


