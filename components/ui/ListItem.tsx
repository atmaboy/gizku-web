'use client'

import { IconChevronRight } from './icons'

export default function ListItem({
  label,
  overline,
  supporting,
  leadingIcon,
  onClick,
  showChevron = true,
  danger = false,
}: {
  label: string
  overline?: string
  supporting?: string
  leadingIcon?: React.ReactNode
  onClick?: () => void
  showChevron?: boolean
  danger?: boolean
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {leadingIcon ? (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: danger ? 'rgba(194,91,88,0.1)' : 'var(--color-bg-brand-tint)',
            color: danger ? 'var(--color-danger)' : 'var(--color-text-brand)',
          }}
        >
          {leadingIcon}
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        {overline ? <div className="text-2xs text-secondary uppercase tracking-[0.5px] mb-0.5">{overline}</div> : null}
        <div className={`text-md ${danger ? 'text-danger' : 'text-primary'} truncate`}>{label}</div>
        {supporting ? <div className="text-xs text-secondary mt-0.5 truncate">{supporting}</div> : null}
      </div>
      {showChevron && onClick ? <IconChevronRight size={14} color="var(--color-text-tertiary)" className="shrink-0" /> : null}
    </div>
  )
}
