'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-0', className)}
      classNames={{
        // react-day-picker v9 uses UI enum keys (e.g. "day_button") for classNames.
        [UI.Months]: 'flex flex-col gap-3',
        [UI.Month]: 'space-y-3',
        [UI.MonthCaption]: 'flex items-center justify-between gap-2',
        [UI.CaptionLabel]: 'text-sm font-semibold',
        [UI.Nav]: 'flex items-center gap-1',
        [UI.PreviousMonthButton]: cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-8 w-8'),
        [UI.NextMonthButton]: cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-8 w-8'),

        [UI.MonthGrid]: 'w-full border-collapse',
        [UI.Weekdays]: 'flex',
        [UI.Weekday]: 'w-9 text-center text-xs font-medium text-muted-foreground',
        // Reserve space for the tallest month (6 weeks) to prevent layout jump.
        // h-9 = 36px, gap-1 = 4px => 6*36 + 5*4 = 236px
        [UI.Weeks]: 'flex min-h-[236px] flex-col gap-1',
        [UI.Week]: 'flex w-full',

        // Day is the cell; DayButton is the actual clickable element.
        [UI.Day]: 'relative h-9 w-9 p-0 text-center',
        [UI.DayButton]: cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-sm font-normal leading-none',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'
        ),

        // SelectionState.* classes apply to the day CELL; style the inner button for the highlight.
        [SelectionState.selected]: cn(
          '[&_button]:bg-accent [&_button]:text-foreground [&_button]:font-medium [&_button]:hover:bg-accent'
        ),

        // Today: show a border, but avoid looking like a 2nd selected day.
        // Selected state is on the DayButton via aria-selected.
        [DayFlag.today]: cn(
          // Use a ring so the outline is visible on dark backgrounds and doesn't rely on border-color overrides.
          '[&_button]:ring-1 [&_button]:ring-primary/60 [&_button]:ring-inset',
          '[&_button:not([aria-selected=\"true\"])]:text-primary [&_button:not([aria-selected=\"true\"])]:font-medium'
        ),
        [DayFlag.outside]:
          'text-muted-foreground/60 aria-selected:bg-accent/50 aria-selected:text-muted-foreground/60',
        [DayFlag.disabled]: 'text-muted-foreground/50 opacity-50',
        [DayFlag.hidden]: 'invisible',
        ...(classNames ?? {}),
      }}
      components={{
        Chevron: (p) => {
          const { className, orientation, ...rest } = p
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Icon className={cn('size-4', className)} {...rest} />
        },
      }}
      {...props}
    />
  )
}


