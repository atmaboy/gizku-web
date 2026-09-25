import { Info, AlertTriangle, AlertOctagon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertVariant = 'info' | 'warning' | 'danger' | 'light'

const V: Record<AlertVariant, { box: string; icon: string; Icon: LucideIcon }> = {
  info:    { box: 'bg-green-50 border-green-200',  icon: 'text-brand',     Icon: Info },
  warning: { box: 'bg-honey-50 border-honey-300',  icon: 'text-honey-500', Icon: AlertTriangle },
  danger:  { box: 'bg-rose-50 border-rose-300',    icon: 'text-rose-500',  Icon: AlertOctagon },
  light:   { box: 'bg-sunken border-border',       icon: 'text-secondary', Icon: Info },
}

export default function Alert({ variant = 'info', title, icon, action, children, className }: {
  variant?: AlertVariant; title?: React.ReactNode; icon?: LucideIcon; action?: React.ReactNode; children?: React.ReactNode; className?: string
}) {
  const v = V[variant]
  const Icon = icon ?? v.Icon
  return (
    <div
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 px-4 py-3 rounded-md border text-base leading-normal text-primary max-sm:flex-wrap', v.box, className)}
    >
      <Icon size={20} className={cn('shrink-0 mt-px', v.icon)} aria-hidden />
      <div className="flex-1 min-w-0 max-sm:basis-[calc(100%-32px)]">
        {title && <strong className="font-semibold">{title}</strong>}{title && children ? ' ' : null}{children}
      </div>
      {action && <div className="shrink-0 self-center max-sm:basis-full max-sm:pl-8">{action}</div>}
    </div>
  )
}
