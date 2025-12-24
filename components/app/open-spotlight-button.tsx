'use client'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

type OpenSpotlightButtonProps = {
  className?: string
}

export function OpenSpotlightButton({ className }: OpenSpotlightButtonProps) {
  function handleClick() {
    openSpotlight()
  }

  function openSpotlight() {
    window.dispatchEvent(new Event('cerna:open-spotlight'))
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label="Search"
      onClick={handleClick}
    >
      <Search aria-hidden="true" />
    </Button>
  )
}
