import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Cerna',
    template: '%s · Cerna',
  },
  description: 'A calm, fast home base for your web resources: quick access, save for later, and smart search.',
  applicationName: 'Cerna',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Cerna',
    description: 'A calm, fast home base for your web resources: quick access, save for later, and smart search.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cerna',
    description: 'A calm, fast home base for your web resources: quick access, save for later, and smart search.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  )
}
