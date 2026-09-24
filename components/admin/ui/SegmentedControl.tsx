'use client'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; icon?: LucideIcon; disabled?: boolean }

export default function SegmentedControl<T extends string>({ options, value, onChange, className, ariaLabel, size = 'md', mobileGrid = true }: {
  options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; className?: string; ariaLabel?: string; size?: 'sm' | 'md'; mobileGrid?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex', mobileGrid && 'max-lg:grid max-lg:grid-cols-2 max-lg:w-full max-lg:gap-2', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 border font-medium whitespace-nowrap transition-colors relative',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:z-10 disabled:opacity-50 disabled:cursor-not-allowed',
              size === 'sm' ? 'min-h-8 px-2.5 text-sm' : 'min-h-[38px] px-3.5 text-base',
              'max-lg:min-h-11 max-lg:text-[15px]',
              i > 0 && '-ml-px',
              i === 0 && 'rounded-l-sm',
              i === options.length - 1 && 'rounded-r-sm',
              mobileGrid && 'max-lg:ml-0 max-lg:rounded-sm',
              active ? 'bg-brand text-white border-brand z-[1]' : 'bg-surface border-border-strong text-bark-800 hover:bg-muted',
            )}
          >
            {Icon && <Icon size={16} aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
