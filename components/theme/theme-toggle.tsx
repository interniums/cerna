'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  function handleToggleTheme() {
    const current = resolvedTheme ?? 'light'
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  const isDark = mounted ? resolvedTheme === 'dark' : false

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleToggleTheme}
      aria-label="Toggle theme"
      disabled={!mounted}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
