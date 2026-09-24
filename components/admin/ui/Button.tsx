import TrackedLink from './TrackedLink'
import { forwardRef } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant =
  | 'primary' | 'secondary' | 'danger' | 'warning'
  | 'outline' | 'outline-primary' | 'outline-danger' | 'outline-warning'
  | 'light' | 'link' | 'tool'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:           'bg-brand text-white hover:bg-brand-hover border border-transparent',
  secondary:         'bg-clay-600 text-white hover:bg-bark-700 border border-transparent',
  danger:            'bg-rose-600 text-white hover:brightness-95 border border-transparent',
  warning:           'bg-warning text-primary hover:brightness-95 border border-transparent',
  outline:           'bg-surface border border-border-strong text-bark-800 hover:bg-muted',
  'outline-primary': 'bg-surface border border-green-500 text-green-700 hover:bg-green-50',
  'outline-danger':  'bg-surface border border-rose-500 text-rose-600 hover:bg-rose-50',
  'outline-warning': 'bg-surface border border-honey-500 text-bark-800 hover:bg-honey-50',
  light:             'bg-muted text-bark-800 hover:bg-sand-200 border border-transparent',
  link:              'bg-transparent text-link hover:text-green-800 hover:underline border border-transparent',
  tool:              'bg-transparent text-secondary hover:bg-muted hover:text-primary border border-transparent',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-[38px] px-3.5 text-base max-lg:min-h-11 max-lg:text-[15px]',
  sm: 'min-h-8 px-2.5 text-sm max-lg:min-h-10 max-lg:text-base',
}

export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) =>
  cn(
    'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-colors select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none',
    VARIANTS[variant], SIZES[size], extra,
  )

type CommonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  fullWidth?: boolean
  className?: string
  children?: React.ReactNode
}

export type ButtonProps = CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { href?: undefined }
export type ButtonLinkProps = CommonProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> & { href: string; disabled?: boolean }

function Inner({ icon: Icon, iconRight: IconRight, loading, size, children }: CommonProps) {
  const s = size === 'sm' ? 14 : 16
  return (
    <>
      {loading ? <Loader2 size={16} className="animate-spin shrink-0" aria-hidden /> : Icon && <Icon size={s} className="shrink-0" aria-hidden />}
      {children}
      {IconRight && <IconRight size={s} className="shrink-0" aria-hidden />}
    </>
  )
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps | ButtonLinkProps>(function Button(props, ref) {
  const { variant = 'primary', size = 'md', icon, iconRight, loading, fullWidth, className, children, ...rest } = props
  const cls = buttonClass(variant, size, cn(fullWidth && 'w-full', className))
  const inner = <Inner icon={icon} iconRight={iconRight} loading={loading} size={size}>{children}</Inner>
  if ('href' in rest && rest.href !== undefined) {
    const { href, disabled, onClick, ...a } = rest as ButtonLinkProps
    const external = /^https?:\/\//.test(href)
    if (external) {
      return <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} aria-disabled={disabled || undefined} onClick={onClick} {...a}>{inner}</a>
    }
    return (
      <TrackedLink ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined} onClick={onClick} {...a}>
        {inner}
      </TrackedLink>
    )
  }
  const { type = 'button', disabled, ...b } = rest as ButtonProps
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...b}>
      {inner}
    </button>
  )
})

export default Button
