'use client'
import { forwardRef, cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/utils'

export const inputClass = (invalid?: boolean, extra?: string) => cn(
  'w-full min-h-[38px] px-3 py-[7px] rounded-sm border border-border-strong bg-surface text-base text-primary',
  'placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
  'disabled:bg-sunken disabled:text-secondary disabled:cursor-not-allowed transition-shadow',
  'max-lg:min-h-11 max-lg:text-md',
  invalid && 'border-rose-500 focus:ring-rose-300',
  extra,
)

type InvalidProp = { invalid?: boolean }

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & InvalidProp>(
  function Input({ className, invalid, ...p }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={inputClass(invalid, className)} {...p} />
  },
)

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & InvalidProp>(
  function Select({ className, invalid, children, ...p }, ref) {
    return (
      <select ref={ref} aria-invalid={invalid || undefined} className={inputClass(invalid, cn('pr-8 cursor-pointer', className))} {...p}>
        {children}
      </select>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProp>(
  function Textarea({ className, invalid, ...p }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} className={inputClass(invalid, cn('leading-normal resize-y', className))} {...p} />
  },
)

export function FormField({ label, htmlFor, help, error, required, children, className, labelAside }: {
  label?: React.ReactNode; htmlFor?: string; help?: React.ReactNode; error?: React.ReactNode; required?: boolean
  children: React.ReactNode; className?: string; labelAside?: React.ReactNode
}) {
  const helpId = htmlFor ? `${htmlFor}-help` : undefined
  const errId = htmlFor ? `${htmlFor}-error` : undefined
  const describedBy = [help && helpId, error && errId].filter(Boolean).join(' ') || undefined
  const child = isValidElement(children) && describedBy
    ? cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': describedBy })
    : children
  return (
    <div className={className}>
      {label && (
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <label htmlFor={htmlFor} className="block text-base font-semibold text-primary">
            {label}{required && <span className="text-rose-600" aria-hidden> *</span>}
          </label>
          {labelAside}
        </div>
      )}
      {child}
      {help && !error && <p id={helpId} className="mt-1.5 text-sm text-secondary leading-normal">{help}</p>}
      {error && <p id={errId} className="mt-1.5 text-sm text-rose-600">{error}</p>}
    </div>
  )
}

/** Input with attached addons (icons, text, buttons). Pass the input as a child. */
export function InputGroup({ prepend, append, children, className }: {
  prepend?: React.ReactNode; append?: React.ReactNode; children: React.ReactElement; className?: string
}) {
  const addon = 'flex items-center px-3 bg-sunken border border-border-strong text-secondary shrink-0'
  const child = cloneElement(children as React.ReactElement<{ className?: string }>, {
    className: cn((children.props as { className?: string }).className, 'min-w-0 flex-1', prepend && 'rounded-l-none', append && 'rounded-r-none'),
  })
  return (
    <div className={cn('flex items-stretch w-full', className)}>
      {prepend && <div className={cn(addon, 'rounded-l-sm border-r-0')}>{prepend}</div>}
      {child}
      {append && <div className={cn(addon, 'rounded-r-sm border-l-0 px-0 [&>*]:h-full')}>{append}</div>}
    </div>
  )
}

/** Icon button for use inside an InputGroup append (e.g. show/hide password). */
export function AddonButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex items-center justify-center px-3 min-w-[40px] text-secondary hover:text-primary hover:bg-muted rounded-r-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {children}
    </button>
  )
}
