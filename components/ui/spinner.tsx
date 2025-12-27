import * as React from 'react'

import { cn } from '@/lib/utils'

type SpinnerProps = React.SVGProps<SVGSVGElement> & {
  /**
   * Accessible label for screen readers.
   * If you use `aria-hidden`, this label is ignored.
   */
  label?: string
}

/**
 * A visually stable spinner (no wobble) that rotates around a perfectly centered viewBox.
 * Prefer this over rotating asymmetric icons (e.g. refresh arrows), which can appear to "bounce".
 */
export function Spinner({ className, label = 'Loading', ...props }: SpinnerProps) {
  const ariaHidden = props['aria-hidden']
  const ariaLabel = ariaHidden ? undefined : (props['aria-label'] ?? label)

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('block shrink-0 animate-spin origin-center text-current', className)}
      role={ariaHidden ? undefined : 'status'}
      aria-label={ariaLabel}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        opacity="0.2"
      />
      <path
        fill="currentColor"
        opacity="0.85"
        d="M12 2a10 10 0 00-10 10h4a6 6 0 016-6V2z"
      />
    </svg>
  )
}


