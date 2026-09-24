'use client'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export default function Switch({ checked, onChange, label, description, disabled, className, id }: {
  checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; description?: React.ReactNode
  disabled?: boolean; className?: string; id?: string
}) {
  const auto = useId()
  const sid = id ?? auto
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        id={sid}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${sid}-l` : undefined}
        aria-describedby={description ? `${sid}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 w-10 h-6 rounded-pill transition-colors duration-150 mt-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-brand' : 'bg-sand-300',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {(label || description) && (
        <div className="min-w-0">
          {label && <label id={`${sid}-l`} htmlFor={sid} className="block text-base font-semibold text-primary cursor-pointer">{label}</label>}
          {description && <p id={`${sid}-d`} className="text-sm text-secondary mt-0.5 leading-normal">{description}</p>}
        </div>
      )}
    </div>
  )
}
