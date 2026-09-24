import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'secondary' | 'light' | 'soft' | 'honeysoft' | 'dark' | 'outline'

const V: Record<BadgeVariant, string> = {
  success:   'bg-brand text-white',
  warning:   'bg-warning text-primary',
  danger:    'bg-rose-600 text-white',
  secondary: 'bg-sand-200 text-bark-800',
  light:     'bg-muted text-secondary',
  soft:      'bg-green-100 text-green-800',
  honeysoft: 'bg-honey-100 text-bark-800',
  dark:      'bg-bark-800 text-white',
  outline:   'bg-surface border border-border-strong text-bark-800',
}

export default function Badge({ variant = 'secondary', pill, size = 'md', icon: Icon, className, children, title }: {
  variant?: BadgeVariant; pill?: boolean; size?: 'sm' | 'md'; icon?: LucideIcon; className?: string; children: React.ReactNode; title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-[3px] font-semibold whitespace-nowrap leading-[1.4]',
        pill ? 'rounded-pill' : 'rounded-sm',
        size === 'sm' ? 'text-[11px] px-1.5 py-[2px]' : 'text-xs',
        V[variant], className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 11 : 12} aria-hidden className="shrink-0" />}
      {children}
    </span>
  )
}
