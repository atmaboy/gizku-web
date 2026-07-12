'use client'

type ButtonVariant = 'primary' | 'outline' | 'danger-outline'
type ButtonSize = 'lg' | 'md'

export default function Button({
  children,
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'lg',
  icon,
  fullWidth = true,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  fullWidth?: boolean
  className?: string
}) {
  const isDisabled = disabled || loading
  const height = size === 'lg' ? 'h-[52px]' : 'h-10'
  const radius = size === 'lg' ? 'rounded-xl' : 'rounded-lg'

  const variantClass = {
    primary: 'bg-brand text-onbrand',
    outline: 'bg-transparent text-primary shadow-hairline-strong',
    'danger-outline': 'bg-transparent text-danger shadow-[inset_0_0_0_1.5px_var(--color-danger)]',
  }[variant]

  const spinnerColor = variant === 'primary' ? '#fff' : 'var(--color-text-primary)'
  const spinnerTrack = variant === 'primary' ? 'rgba(255,255,255,.4)' : 'rgba(36,30,25,.18)'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${fullWidth ? 'w-full' : ''} ${height} ${radius} ${variantClass} flex items-center justify-center gap-2 font-semibold text-base transition-opacity ${isDisabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} ${className}`}
    >
      {loading ? (
        <span
          className="inline-block w-4 h-4 rounded-full animate-spin"
          style={{ border: `2px solid ${spinnerTrack}`, borderTopColor: spinnerColor }}
        />
      ) : icon}
      {children}
    </button>
  )
}
