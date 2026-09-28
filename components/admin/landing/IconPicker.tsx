'use client'
import { useState } from 'react'
import { LANDING_ICONS } from '@/components/landing/sections/icons'
import { ICON_KEYS, type IconKey } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'

const VISIBLE = 6

/** Icon set picker (radio group). Shows 6 icons + "+N ikon lain". */
export default function IconPicker({ value, onChange, label = 'Ikon' }: { value: IconKey; onChange: (k: IconKey) => void; label?: string }) {
  const [all, setAll] = useState(() => ICON_KEYS.indexOf(value) >= VISIBLE)
  const keys = all ? ICON_KEYS : ICON_KEYS.slice(0, VISIBLE)
  return (
    <div>
      <p className="text-base font-semibold text-primary mb-1.5" id="icon-picker-label">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {keys.map(k => {
          const { icon: Icon, label: name } = LANDING_ICONS[k]
          const on = k === value
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={name}
              title={name}
              onClick={() => onChange(k)}
              className={cn(
                'w-12 h-11 rounded-md border flex items-center justify-center transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                on ? 'bg-green-600 border-green-600 text-white' : 'bg-surface border-border-strong text-bark-800 hover:bg-muted',
              )}
            >
              <Icon size={20} strokeWidth={1.8} aria-hidden />
            </button>
          )
        })}
        {!all && (
          <button type="button" onClick={() => setAll(true)} className="px-2 h-11 text-sm text-secondary hover:text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
            +{ICON_KEYS.length - VISIBLE} ikon lain
          </button>
        )}
      </div>
    </div>
  )
}
