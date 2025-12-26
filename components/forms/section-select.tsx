import { ChevronDown } from 'lucide-react'

import type { Category } from '@/lib/db/categories'

type SectionSelectProps = {
  categories: Category[]
  defaultValue?: string
  id?: string
  name?: string
  label?: string
}

export function SectionSelect({
  categories,
  defaultValue,
  id = 'categoryId',
  name = 'categoryId',
  label = 'Section',
}: SectionSelectProps) {
  const hasCategories = categories.length > 0

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full appearance-none rounded-md border bg-transparent py-1 pl-3 pr-12 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          defaultValue={defaultValue ?? ''}
        >
          <option value="">{hasCategories ? 'Uncategorized' : 'Uncategorized (no sections yet)'}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 -mt-[4.5px] text-muted-foreground">
          <ChevronDown aria-hidden="true" className="size-4" />
        </div>
      </div>
    </div>
  )
}


