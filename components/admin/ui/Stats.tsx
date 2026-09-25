import TrackedLink from './TrackedLink'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const SMALLBOX_TONE = {
  brand:   'bg-brand text-white',
  warning: 'bg-warning text-primary',
  dark:    'bg-bark-700 text-white',
  clay:    'bg-clay-600 text-white',
} as const

export function SmallBox({ value, label, icon: Icon, tone = 'brand', href, footerLabel = 'Info lebih lanjut', className, valueClassName }: {
  value: React.ReactNode; label: React.ReactNode; icon: LucideIcon; tone?: keyof typeof SMALLBOX_TONE
  href?: string; footerLabel?: string; className?: string; valueClassName?: string
}) {
  return (
    <div className={cn('rounded-md shadow-card overflow-hidden relative flex flex-col', SMALLBOX_TONE[tone], className)}>
      <div className="px-[18px] pt-4 pb-3.5 max-lg:px-3.5 max-lg:pt-3 max-lg:pb-2.5 relative flex-1">
        <div className={cn('text-[34px] max-lg:text-[26px] font-bold tracking-[-0.02em] leading-[1.1] tabular-nums relative z-[1]', valueClassName)}>{value}</div>
        <div className="text-[15px] max-lg:text-sm font-medium mt-1.5 relative z-[1] max-lg:pr-8">{label}</div>
        <Icon aria-hidden strokeWidth={1.6} className="absolute right-4 top-3.5 max-lg:right-2.5 max-lg:top-2.5 w-16 h-16 max-lg:w-[34px] max-lg:h-[34px] text-black/15" />
      </div>
      {href && (
        <TrackedLink
          href={href}
          className="flex items-center justify-center gap-1 py-1.5 max-lg:min-h-9 bg-black/10 hover:bg-black/15 text-[13px] max-lg:text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          style={{ color: 'inherit' }}
        >
          {footerLabel}<ChevronRight size={14} aria-hidden />
        </TrackedLink>
      )}
    </div>
  )
}

export const ICON_TONE = {
  brand:  'bg-brand text-white',
  green:  'bg-green-100 text-green-700',
  honey:  'bg-honey-100 text-bark-800',
  sand:   'bg-muted text-secondary',
  danger: 'bg-rose-600 text-white',
  telegram: 'bg-tgc-50 text-tgc-700',
} as const
export type IconTone = keyof typeof ICON_TONE

const BAR_TONE: Record<IconTone, string> = {
  brand: 'bg-brand', green: 'bg-green-500', honey: 'bg-honey-500', sand: 'bg-clay-500', danger: 'bg-rose-500', telegram: 'bg-tgc-500',
}

export function Progress({ value, tone = 'brand', className, label, height = 4 }: {
  value: number; tone?: IconTone | 'rose' | 'clay'; className?: string; label?: string; height?: number
}) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const bar = tone === 'rose' ? 'bg-rose-500' : tone === 'clay' ? 'bg-clay-500' : BAR_TONE[tone]
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full bg-muted rounded-pill overflow-hidden', className)}
      style={{ height }}
    >
      <div className={cn('h-full rounded-pill transition-[width] duration-300', bar)} style={{ width: `${v}%` }} />
    </div>
  )
}

export function InfoBox({ icon: Icon, iconTone = 'brand', label, value, progress, description, className }: {
  icon: LucideIcon; iconTone?: IconTone; label: React.ReactNode; value: React.ReactNode; progress?: number; description?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3.5 p-2.5 min-h-[90px] bg-surface rounded-md shadow-card min-w-0', className)}>
      <div className={cn('w-16 h-16 rounded-sm flex items-center justify-center shrink-0', ICON_TONE[iconTone])}>
        <Icon size={28} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pr-1">
        <div className="text-base text-secondary truncate">{label}</div>
        <div className="text-xl font-bold text-primary tabular-nums leading-tight truncate">{value}</div>
        {progress !== undefined && <Progress value={progress} tone={iconTone} className="mt-1.5" label={typeof label === 'string' ? label : undefined} />}
        {description && <div className="text-xs text-secondary mt-1 truncate">{description}</div>}
      </div>
    </div>
  )
}

export function StatTile({ icon: Icon, iconTone = 'brand', label, value, sub, progress, className }: {
  icon: LucideIcon; iconTone?: IconTone; label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; progress?: number; className?: string
}) {
  return (
    <div className={cn('bg-surface rounded-md shadow-card p-3 min-w-0', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className={cn('w-[34px] h-[34px] rounded-sm flex items-center justify-center shrink-0', ICON_TONE[iconTone])}>
          <Icon size={18} aria-hidden />
        </div>
        <div className="text-xl font-bold text-primary tabular-nums truncate">{value}</div>
      </div>
      <div className="text-sm text-secondary mt-2 truncate">{label}</div>
      {sub && <div className="text-[11px] text-secondary truncate">{sub}</div>}
      {progress !== undefined && <Progress value={progress} tone={iconTone} className="mt-1.5" />}
    </div>
  )
}

/** Responsive stat: InfoBox on desktop (lg+), StatTile on mobile. */
export function ResponsiveStat(props: {
  icon: LucideIcon; iconTone?: IconTone; label: React.ReactNode; value: React.ReactNode; mobileValue?: React.ReactNode
  progress?: number; description?: React.ReactNode; sub?: React.ReactNode; className?: string
}) {
  const { mobileValue, sub, description, ...rest } = props
  return (
    <>
      <InfoBox {...rest} description={description} className={cn('max-lg:hidden', props.className)} />
      <StatTile {...rest} value={mobileValue ?? props.value} sub={sub ?? description} className={cn('lg:hidden', props.className)} />
    </>
  )
}
