'use client'

import * as React from 'react'
import { addMonths, format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseYmd(value: string) {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null
  const d = new Date(y, mo, day)
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null
  return d
}

type DatePickerProps = {
  id: string
  name: string
  value?: string
  placeholder?: string
  disabled?: boolean
  onValueChange?: (ymd: string) => void
  triggerClassName?: string
  textClassName?: string
  rightAdornment?: React.ReactNode
}

export function DatePicker({
  id,
  name,
  value,
  placeholder = 'Pick a date',
  disabled,
  onValueChange,
  triggerClassName,
  textClassName,
  rightAdornment,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value ?? '')
  const [month, setMonth] = React.useState<Date>(() => {
    const initial = value ? parseYmd(value) : null
    return initial ?? new Date()
  })

  const selected = React.useMemo(() => parseYmd(internalValue), [internalValue])

  React.useEffect(() => {
    if (value === undefined) return
    queueMicrotask(() => setInternalValue(value))
  }, [value])

  React.useEffect(() => {
    if (!onValueChange) return
    onValueChange(internalValue)
  }, [internalValue, onValueChange])

  const display = React.useMemo(() => {
    if (!selected) return ''
    // Display is friendly; submitted value is hidden YYYY-MM-DD.
    return format(selected, 'MMM d, yyyy')
  }, [selected])

  const monthLabel = React.useMemo(() => format(month, 'MMMM yyyy'), [month])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (disabled) return
      if (next) {
        const base = selected ?? new Date()
        // Keep month view aligned with selected date (or today)
        setMonth(new Date(base.getFullYear(), base.getMonth(), 1))
      }
      setOpen(next)
    },
    [disabled, selected]
  )

  const handleTriggerKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
    },
    [disabled]
  )

  const handleSelect = React.useCallback((d: Date | undefined) => {
    if (!d) return
    setInternalValue(formatYmd(d))
    setOpen(false)
  }, [])

  const handleClear = React.useCallback(
    () => {
      setInternalValue('')
      setOpen(false)
    },
    []
  )

  const handleDone = React.useCallback(() => {
    setOpen(false)
  }, [])

  const handleToday = React.useCallback(() => {
    const today = new Date()
    setInternalValue(formatYmd(today))
    setOpen(false)
  }, [])

  const handlePrevMonth = React.useCallback(() => {
    setMonth((m) => addMonths(m, -1))
  }, [])

  const handleNextMonth = React.useCallback(() => {
    setMonth((m) => addMonths(m, 1))
  }, [])

  return (
    <div className="relative">
      <input type="hidden" name={name} value={internalValue} />

      <Popover open={open} onOpenChange={handleOpenChange}>
        <div className="relative">
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              onKeyDown={handleTriggerKeyDown}
              className={cn(
                // Match `Input` styling, but use a button so Radix trigger behavior is stable.
                'border-input dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                'cursor-pointer text-left',
                triggerClassName
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className={cn('min-w-0 flex-1 truncate', !display && 'text-muted-foreground', textClassName)}>
                  {display || placeholder}
                </span>
                {rightAdornment ? <span className="shrink-0">{rightAdornment}</span> : null}
                <CalendarIcon aria-hidden="true" className="size-4 text-muted-foreground" />
              </span>
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-[280px] max-w-[360px] p-3"
        >
          {/* Header: month navigation (matches previous UI) */}
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month" onClick={handlePrevMonth}>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
            <p className="text-sm font-medium select-none">{monthLabel}</p>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Next month" onClick={handleNextMonth}>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>

          <div className="mt-2">
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={selected ?? undefined}
              onSelect={handleSelect}
              initialFocus
              // Hide built-in caption/nav; we render our own above to match the old picker.
              classNames={{
                month_caption: 'hidden',
                caption_label: 'hidden',
                nav: 'hidden',
              }}
            />
          </div>

          {/* Footer: actions (matches previous UI) */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!internalValue}>
                <X aria-hidden="true" className="mr-2 size-4" />
                Clear
              </Button>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleDone}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
