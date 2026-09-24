'use client'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export type TabItem<T extends string> = { value: T; label: React.ReactNode; mobileLabel?: React.ReactNode; badge?: React.ReactNode }

/**
 * AdminLTE nav-tabs / nav-pills. On mobile (<lg) both variants render as a
 * segmented pill group filling the width.
 */
export default function Tabs<T extends string>({ items, value, onChange, variant = 'tabs', className, ariaLabel, idPrefix }: {
  items: TabItem<T>[]; value: T; onChange: (v: T) => void; variant?: 'tabs' | 'pills'; className?: string; ariaLabel?: string; idPrefix?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    onChange(items[n].value)
    refs.current[n]?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-end gap-1',
        variant === 'tabs' && 'lg:-mb-px',
        'max-lg:grid max-lg:gap-1 max-lg:p-1 max-lg:bg-muted max-lg:rounded-md max-lg:w-full',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it, i) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            ref={el => { refs.current[i] = el }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${it.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${it.value}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={e => onKey(e, i)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 text-base whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
              variant === 'tabs'
                ? cn('lg:px-4 lg:py-2.5 lg:rounded-t-sm lg:border lg:border-transparent',
                    active ? 'lg:bg-surface lg:border-border lg:border-b-surface lg:font-semibold lg:text-primary' : 'lg:text-link lg:hover:bg-muted')
                : cn('lg:px-3.5 lg:py-2 lg:rounded-sm',
                    active ? 'lg:bg-brand lg:text-white lg:font-semibold' : 'lg:text-link lg:hover:bg-muted'),
              'max-lg:min-h-11 max-lg:px-2 max-lg:rounded-sm max-lg:text-[15px]',
              active ? 'max-lg:bg-brand max-lg:text-white max-lg:font-semibold max-lg:shadow-xs' : 'max-lg:text-bark-800',
            )}
          >
            {it.mobileLabel ? (<><span className="lg:hidden truncate">{it.mobileLabel}</span><span className="max-lg:hidden">{it.label}</span></>) : <span className="truncate">{it.label}</span>}
            {it.badge}
          </button>
        )
      })}
    </div>
  )
}
