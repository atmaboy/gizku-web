'use client'

import Button from './Button'

export type DialogAction = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'outline' | 'danger-outline'
  loading?: boolean
}

export default function Dialog({
  open,
  onClose,
  title,
  description,
  actions,
  dismissOnBackdrop = true,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  actions?: DialogAction[]
  dismissOnBackdrop?: boolean
  children?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      onClick={dismissOnBackdrop ? onClose : undefined}
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: 'var(--color-bg-scrim)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[340px] bg-surface rounded-2xl p-6"
      >
        {title ? <div className="text-lg font-semibold text-primary text-center mb-2">{title}</div> : null}
        {description ? <div className="text-sm text-secondary text-center leading-normal mb-5">{description}</div> : null}
        {children}
        {actions && actions.length > 0 ? (
          <div className="flex flex-col gap-2.5 mt-1">
            {actions.map((a, i) => (
              <Button key={i} variant={a.variant ?? 'primary'} size="md" onClick={a.onClick} loading={a.loading}>
                {a.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
