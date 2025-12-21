import { cn } from '@/lib/utils'

type ContainerProps = React.PropsWithChildren<{
  className?: string
}>

export function Container({ className, children }: ContainerProps) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</div>
}
