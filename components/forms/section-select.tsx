
'use client'

import { useCallback, useMemo, useState } from 'react'

import type { Category } from '@/lib/db/categories'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const UNCATEGORIZED_VALUE = '__uncategorized__'

type SectionSelectProps = {
  categories: Category[]
  defaultValue?: string
  id?: string
  name?: string
  label?: string
  disabled?: boolean
  /**
   * Called whenever the user changes selection.
   * Receives the submitted value (empty string means Uncategorized).
   */
  onSubmittedValueChange?: (categoryId: string) => void
  /**
   * When true, applies the same visual invalid state as `Input` (red border + ring).
   */
  'aria-invalid'?: boolean
}

export function SectionSelect({
  categories,
  defaultValue,
  id = 'categoryId',
  name = 'categoryId',
  label = 'Section',
  disabled,
  onSubmittedValueChange,
  'aria-invalid': ariaInvalid,
}: SectionSelectProps) {
  const uncategorizedLabel = useMemo(() => {
    return categories.length > 0 ? 'Uncategorized' : 'Uncategorized (no sections yet)'
  }, [categories.length])

  const [value, setValue] = useState<string>(() => (defaultValue?.trim() ? defaultValue.trim() : UNCATEGORIZED_VALUE))

  const handleValueChange = useCallback(
    (next: string) => {
      setValue(next)
      const submitted = next === UNCATEGORIZED_VALUE ? '' : next
      onSubmittedValueChange?.(submitted)
    },
    [onSubmittedValueChange]
  )

  const submittedValue = value === UNCATEGORIZED_VALUE ? '' : value

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </label>

      {/* Radix Select doesn't submit with HTML forms; we bridge it with a hidden input. */}
      <input type="hidden" name={name} value={submittedValue} />

      <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={label} aria-invalid={ariaInvalid}>
          <SelectValue placeholder={uncategorizedLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNCATEGORIZED_VALUE}>{uncategorizedLabel}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


