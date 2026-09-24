import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const OUTLINE = {
  brand:   'border-t-[3px] border-t-brand',
  warning: 'border-t-[3px] border-t-honey-500',
  danger:  'border-t-[3px] border-t-rose-500',
} as const

export function Card({
  title, icon: Icon, subtitle, tools, outline, footer, children, className, bodyClassName, headerClassName, noPadding, id, as: As = 'section',
}: {
  title?: React.ReactNode
  icon?: LucideIcon
  subtitle?: React.ReactNode
  tools?: React.ReactNode
  outline?: keyof typeof OUTLINE
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
  bodyClassName?: string
  headerClassName?: string
  noPadding?: boolean
  id?: string
  as?: 'section' | 'div'
}) {
  const hasHeader = title !== undefined || tools !== undefined
  return (
    <As id={id} className={cn('bg-surface rounded-md shadow-card overflow-hidden min-w-0', outline && OUTLINE[outline], className)}>
      {hasHeader && (
        <div className={cn('min-h-[52px] px-4 py-2 border-b border-border flex items-center gap-3 flex-wrap', headerClassName)}>
          {(title !== undefined || Icon) && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {Icon && <Icon size={18} className="text-secondary shrink-0" aria-hidden />}
              <div className="min-w-0">
                {title !== undefined && <h2 className="text-md font-semibold text-primary leading-tight">{title}</h2>}
                {subtitle && <p className="text-sm text-secondary mt-0.5">{subtitle}</p>}
              </div>
            </div>
          )}
          {tools && <div className="flex items-center gap-1.5 ml-auto flex-wrap">{tools}</div>}
        </div>
      )}
      {children !== undefined && children !== null && children !== false && (
        <div className={cn(!noPadding && 'p-4', bodyClassName)}>{children}</div>
      )}
      {footer && <div className="px-4 py-3 bg-sunken border-t border-border">{footer}</div>}
    </As>
  )
}

export function CardTool({ icon: Icon, label, onClick, className, disabled }: {
  icon: LucideIcon; label: string; onClick?: () => void; className?: string; disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center w-[30px] h-[30px] max-lg:w-10 max-lg:h-10 rounded-sm text-secondary hover:bg-muted hover:text-primary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}
