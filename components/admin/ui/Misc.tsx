import TrackedLink from './TrackedLink'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_TONE = {
  green:    'bg-green-100 text-green-800',
  brand:    'bg-brand text-white',
  telegram: 'bg-tgc-50 text-tgc-700',
  sand:     'bg-muted text-secondary',
} as const

export function Avatar({ name, size = 30, tone = 'green', className }: { name: string | null | undefined; size?: number; tone?: keyof typeof AVATAR_TONE; className?: string }) {
  const ch = (name ?? '?').replace(/^@/, '').trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn('inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none', AVATAR_TONE[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {ch}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: LucideIcon; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-12 max-lg:p-8', className)}>
      <Icon size={36} className="text-sand-300 mb-3" aria-hidden />
      <p className="text-base font-semibold text-primary">{title}</p>
      {description && <p className="text-sm text-secondary mt-1 max-w-md leading-normal">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse bg-muted rounded-sm', className)} />
}

export function ListRow({ leading, title, meta, trailing, href, onClick, className }: {
  leading?: React.ReactNode; title: React.ReactNode; meta?: React.ReactNode; trailing?: React.ReactNode
  href?: string; onClick?: () => void; className?: string
}) {
  const cls = cn('flex items-center gap-3 px-3.5 py-3 min-h-11 border-t border-border first:border-t-0 w-full text-left', (href || onClick) && 'hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500', className)
  const inner = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold text-primary truncate">{title}</div>
        {meta && <div className="text-sm text-secondary truncate mt-0.5">{meta}</div>}
      </div>
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </>
  )
  if (href) return <TrackedLink href={href} className={cls}>{inner}</TrackedLink>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

/** Key–value list (AdminLTE list-group-unbordered). */
export function KeyValue({ items, className, dense }: { items: { label: React.ReactNode; value: React.ReactNode; icon?: LucideIcon }[]; className?: string; dense?: boolean }) {
  return (
    <dl className={cn('divide-y divide-border', className)}>
      {items.map((it, i) => {
        const Icon = it.icon
        return (
          <div key={i} className={cn('flex items-center justify-between gap-3', dense ? 'py-2' : 'py-2.5')}>
            <dt className="text-base text-secondary flex items-center gap-2 min-w-0">
              {Icon && <Icon size={16} aria-hidden className="shrink-0" />}
              <span className="truncate">{it.label}</span>
            </dt>
            <dd className="text-base font-semibold text-primary text-right min-w-0 break-words">{it.value}</dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Inline code chip used for slugs, IDs, model names. */
export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return <code className={cn('px-1.5 py-0.5 rounded-xs bg-muted text-bark-800 text-[12.5px] font-mono break-all', className)}>{children}</code>
}

/** Numbered section header (Blast New). */
export function SectionNumber({ n }: { n: number }) {
  return <span aria-hidden className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-sm font-bold shrink-0">{n}</span>
}
