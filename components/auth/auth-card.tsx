import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AuthCardProps = React.PropsWithChildren<{
  title: string
  description: string
  footerText: string
  footerHref: string
  footerLinkText: string
  className?: string
}>

export function AuthCard({
  title,
  description,
  footerText,
  footerHref,
  footerLinkText,
  className,
  children,
}: AuthCardProps) {
  return (
    <div className={cn('mx-auto w-full max-w-sm', className)}>
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {children}
          <p className="text-sm text-muted-foreground">
            {footerText}{' '}
            <Link href={footerHref} className="text-foreground underline-offset-4 hover:underline">
              {footerLinkText}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
