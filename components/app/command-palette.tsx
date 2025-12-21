'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type CommandPaletteProps = {
  defaultOpen?: boolean
}

function isKShortcut(event: KeyboardEvent) {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? event.metaKey : event.ctrlKey
  return mod && event.key.toLowerCase() === 'k'
}

export function CommandPalette({ defaultOpen = false }: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState('')

  const items = useMemo(
    () => [
      { label: 'Search', href: '/app/search' },
      { label: 'Dashboard', href: '/app' },
      { label: 'Pinned', href: '/app/pinned' },
      { label: 'All', href: '/app/all' },
      { label: 'Archive', href: '/app/archive' },
      { label: 'Settings', href: '/app/settings' },
    ],
    []
  )

  function close() {
    setOpen(false)
    setQuery('')
  }

  function goTo(href: string) {
    close()
    router.push(href)
  }

  function goToSearchWithQuery() {
    const q = query.trim()
    close()
    router.push(q ? `/app/search?q=${encodeURIComponent(q)}` : '/app/search')
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isKShortcut(event)) {
        event.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search or jump to…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                goToSearchWithQuery()
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Navigate">
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => goTo(item.href)}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}


