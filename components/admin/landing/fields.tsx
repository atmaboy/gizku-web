'use client'
/**
 * Form building blocks for the Landing Builder (on top of components/admin/ui).
 */
import { useId, useState } from 'react'
import { ChevronDown, GripVertical, Plus, X } from 'lucide-react'
import { Input, Select, Switch, Textarea } from '@/components/admin/ui'
import { SECTION_KEYS, SECTION_LABELS, type Link, type LinkTarget, type SectionKey } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'

/* ── Counter ─────────────────────────────────────────────────────────────── */
export function CharCounter({ n, max, id }: { n: number; max: number; id?: string }) {
  const over = n > max
  return (
    <span id={id} className={cn('text-sm tabular-nums', over ? 'text-rose-600 font-semibold' : 'text-secondary')} aria-live={over ? 'polite' : undefined}>
      {n}/{max}
    </span>
  )
}

/* ── Text field with label, counter, help/error ─────────────────────────── */
export function TextField({
  label, value, onChange, max, required, help, error, placeholder, multiline, rows = 2, mono, optional, className, overMessage, inputClassName, autoFocus,
}: {
  label?: React.ReactNode
  value: string
  onChange: (v: string) => void
  max?: number
  required?: boolean
  help?: React.ReactNode
  error?: React.ReactNode
  placeholder?: string
  multiline?: boolean
  rows?: number
  mono?: boolean
  optional?: boolean
  className?: string
  /** Shown instead of `help` when the value is over `max`. */
  overMessage?: string
  inputClassName?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const over = max !== undefined && value.length > max
  const err = error ?? (over ? (overMessage ?? `Maksimal ${max} karakter.`) : undefined)
  const describedBy = [help && !err ? `${id}-h` : null, err ? `${id}-e` : null].filter(Boolean).join(' ') || undefined
  const common = {
    id, value, placeholder, autoFocus,
    invalid: !!err,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    className: cn(mono && 'font-mono text-[13px]', inputClassName),
  }
  return (
    <div className={className}>
      {label !== undefined && (
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <label htmlFor={id} className="text-base font-semibold text-primary">
            {label}
            {required && <span className="text-rose-600" aria-hidden> *</span>}
            {optional && <span className="font-normal text-secondary"> (opsional)</span>}
          </label>
          {max !== undefined && <CharCounter n={value.length} max={max} />}
        </div>
      )}
      {multiline
        ? <Textarea {...common} rows={rows} onChange={e => onChange(e.target.value)} />
        : <Input {...common} onChange={e => onChange(e.target.value)} />}
      {help && !err && <p id={`${id}-h`} className="mt-1.5 text-sm text-secondary leading-normal">{help}</p>}
      {err && <p id={`${id}-e`} className="mt-1.5 text-sm text-rose-600">{err}</p>}
    </div>
  )
}

/* ── Link target ─────────────────────────────────────────────────────────── */

function targetValue(t: LinkTarget): string {
  return t.kind === 'section' ? `section:${t.section}` : t.kind
}

export function TargetSelect({ value, onChange, allowAuto = true, sectionHidden, id, ariaLabel }: {
  value: LinkTarget
  onChange: (t: LinkTarget) => void
  allowAuto?: boolean
  /** Section keys that are currently hidden — labelled "(disembunyikan)". */
  sectionHidden?: (k: SectionKey) => boolean
  id?: string
  ariaLabel?: string
}) {
  const current = targetValue(value)
  return (
    <div className="flex flex-col gap-2">
      <Select
        id={id}
        aria-label={ariaLabel}
        value={current}
        onChange={e => {
          const v = e.target.value
          if (v.startsWith('section:')) onChange({ kind: 'section', section: v.slice(8) as SectionKey })
          else if (v === 'auto') onChange({ kind: 'auto' })
          else if (v === 'internal') onChange({ kind: 'internal', path: value.kind === 'internal' ? value.path : '/' })
          else onChange({ kind: 'external', url: value.kind === 'external' ? value.url : 'https://' })
        }}
      >
        {allowAuto && <option value="auto">Otomatis (login / aplikasi)</option>}
        <optgroup label="Scroll ke section">
          {SECTION_KEYS.map(k => (
            <option key={k} value={`section:${k}`}>Section: {SECTION_LABELS[k]}{sectionHidden?.(k) ? ' (disembunyikan)' : ''}</option>
          ))}
        </optgroup>
        <option value="internal">URL internal (/…)</option>
        <option value="external">URL eksternal (https://…)</option>
      </Select>
      {value.kind === 'internal' && (
        <Input aria-label="URL internal" className="font-mono text-[13px]" value={value.path} placeholder="/legal/kebijakan-privasi" onChange={e => onChange({ kind: 'internal', path: e.target.value })} />
      )}
      {value.kind === 'external' && (
        <Input aria-label="URL eksternal" className="font-mono text-[13px]" value={value.url} placeholder="https://… atau mailto:…" onChange={e => onChange({ kind: 'external', url: e.target.value })} />
      )}
    </div>
  )
}

/** Label + destination side by side (e.g. "Tombol utama" / "Tujuan"). */
export function LinkField({ label, value, onChange, allowAuto = true, sectionHidden, placeholder, optional, labelMax = 40 }: {
  label: string
  value: Link
  onChange: (l: Link) => void
  allowAuto?: boolean
  sectionHidden?: (k: SectionKey) => boolean
  placeholder?: string
  optional?: boolean
  labelMax?: number
}) {
  const id = useId()
  const over = value.label.length > labelMax
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label htmlFor={`${id}-l`} className="block text-base font-semibold text-primary mb-1.5">
          {label}{optional && <span className="font-normal text-secondary"> (opsional)</span>}
        </label>
        <Input id={`${id}-l`} value={value.label} placeholder={placeholder} invalid={over} onChange={e => onChange({ ...value, label: e.target.value })} />
        {over && <p className="mt-1.5 text-sm text-rose-600">Maksimal {labelMax} karakter.</p>}
      </div>
      <div>
        <label htmlFor={`${id}-t`} className="block text-base font-semibold text-primary mb-1.5">Tujuan</label>
        <TargetSelect id={`${id}-t`} value={value.target} onChange={t => onChange({ ...value, target: t })} allowAuto={allowAuto} sectionHidden={sectionHidden} />
      </div>
    </div>
  )
}

/* ── Misc ────────────────────────────────────────────────────────────────── */
export function ToggleCard({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; description?: React.ReactNode
}) {
  return (
    <div className="rounded-md bg-sunken px-4 py-3.5">
      <Switch checked={checked} onChange={onChange} label={label} description={description} />
    </div>
  )
}

export function Group({ title, children, className, aside }: { title: React.ReactNode; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <fieldset className={cn('rounded-md border border-border px-4 pt-2 pb-4 min-w-0', className)}>
      <legend className="px-1.5 text-base font-semibold text-primary">{title}</legend>
      {aside && <div className="-mt-1 mb-2 flex justify-end">{aside}</div>}
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  )
}

export function ListHeader({ title, count, max, action }: { title: string; count: number; max?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h3 className="text-md font-semibold text-primary">
        {title} <span className="font-normal text-secondary">({max ? `${count} dari maks. ${max}` : count})</span>
      </h3>
      {action}
    </div>
  )
}

export function AddButton({ onClick, children, disabled, block, className }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; block?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 min-h-[38px] max-lg:min-h-11 px-3.5 rounded-sm border border-dashed border-green-400 text-green-700 bg-surface text-base font-semibold',
        'hover:bg-green-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface',
        block && 'w-full',
        className,
      )}
    >
      <Plus size={16} aria-hidden />
      {children}
    </button>
  )
}

export function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-8 h-8 max-lg:w-11 max-lg:h-11 rounded-sm text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 shrink-0"
    >
      <X size={16} aria-hidden />
    </button>
  )
}

export function StatusPill({ status }: { status: 'live' | 'draft' }) {
  return status === 'live'
    ? <span className="inline-flex px-2 py-[3px] rounded-pill bg-green-100 text-green-800 text-xs font-semibold">Tayang</span>
    : <span className="inline-flex px-2 py-[3px] rounded-pill bg-sand-200 text-bark-800 text-xs font-semibold">Draf</span>
}

/** Drag handle visual (the listeners are attached by SortableList). */
export function Grip({ className }: { className?: string }) {
  return <GripVertical size={16} aria-hidden className={cn('text-tertiary', className)} />
}

/** Collapsible item card (steps, features, FAQ, footer groups). */
export function ItemCard({
  open, onToggle, handle, title, subtitle, trailing, children, active,
}: {
  open: boolean
  onToggle: () => void
  handle?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  children?: React.ReactNode
  active?: boolean
}) {
  const id = useId()
  return (
    <div className={cn('rounded-md bg-surface border transition-colors', open || active ? 'border-green-600 border-[1.5px]' : 'border-border')}>
      <div className="flex items-center gap-2 pl-1.5 pr-2 min-h-[52px]">
        {handle}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className="flex-1 min-w-0 flex items-center gap-3 py-2 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-base font-semibold text-primary truncate">{title}</span>
            {subtitle && <span className="block text-sm text-secondary truncate">{subtitle}</span>}
          </span>
          {trailing}
          <ChevronDown size={18} aria-hidden className={cn('text-secondary shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && <div id={`${id}-body`} className="px-4 pb-4 pt-1 flex flex-col gap-4">{children}</div>}
    </div>
  )
}

/** Single-open accordion state helper. */
export function useOpenItem(initial: string | null = null) {
  const [open, setOpen] = useState<string | null>(initial)
  return { open, toggle: (id: string) => setOpen(o => (o === id ? null : id)), setOpen }
}

/** Colour/style choice cards (Statistik band, CTA background). */
export function SwatchChoice<T extends string>({ label, value, onChange, options }: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; swatch: string }[]
}) {
  return (
    <div>
      <p className="text-base font-semibold text-primary mb-1.5">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
        {options.map(o => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex flex-col gap-2 p-2.5 rounded-md border text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                on ? 'border-green-600 border-[1.5px] bg-green-50' : 'border-border hover:bg-muted',
              )}
            >
              <span aria-hidden className={cn('h-6 rounded-sm border border-black/5', o.swatch)} />
              <span className={cn('text-sm', on ? 'font-semibold text-primary' : 'text-secondary')}>{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
