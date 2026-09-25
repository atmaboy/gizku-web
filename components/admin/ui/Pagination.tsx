'use client'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function pages(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, page - 1), end = Math.min(total - 1, page + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}

/**
 * Either `onPage` (client state) or `hrefPattern` (URL-driven; `__PAGE__` is
 * replaced by the page number — a string so server components can pass it).
 */
export default function Pagination({ page, totalPages, onPage, hrefPattern, label, className }: {
  page: number; totalPages: number; onPage?: (p: number) => void; hrefPattern?: string; label?: React.ReactNode; className?: string
}) {
  const hrefFor = hrefPattern ? (p: number) => hrefPattern.replace('__PAGE__', String(p)) : undefined
  const total = Math.max(1, totalPages)
  const item = 'inline-flex items-center justify-center min-w-8 h-8 px-2.5 border border-border-strong -ml-px text-sm bg-surface text-link transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:z-10 relative'
  const disabledCls = 'text-tertiary cursor-not-allowed pointer-events-none'

  function Ctl({ p, disabled, children, className: c, ariaLabel, current }: { p: number; disabled?: boolean; children: React.ReactNode; className?: string; ariaLabel?: string; current?: boolean }) {
    const cls = cn(item, !disabled && !current && 'hover:bg-muted', current && 'bg-brand text-white border-brand z-[1]', disabled && disabledCls, c)
    if (hrefFor && !disabled && !current) {
      return <Link href={hrefFor(p)} className={cls} aria-label={ariaLabel} onClick={() => document.dispatchEvent(new Event('nav:start'))}>{children}</Link>
    }
    return (
      <button type="button" className={cls} disabled={disabled} aria-label={ariaLabel} aria-current={current ? 'page' : undefined} onClick={() => !current && onPage?.(p)}>
        {children}
      </button>
    )
  }

  const mobileBtn = 'inline-flex items-center justify-center gap-1 min-h-11 px-3 rounded-sm border border-border-strong bg-surface text-base font-medium text-bark-800'

  function MobileCtl({ p, disabled, children, ariaLabel }: { p: number; disabled: boolean; children: React.ReactNode; ariaLabel: string }) {
    if (hrefFor && !disabled) return <Link href={hrefFor(p)} className={mobileBtn} aria-label={ariaLabel}>{children}</Link>
    return <button type="button" disabled={disabled} onClick={() => onPage?.(p)} aria-label={ariaLabel} className={cn(mobileBtn, 'disabled:opacity-50 disabled:cursor-not-allowed')}>{children}</button>
  }

  return (
    <nav aria-label="Navigasi halaman" className={className}>
      {/* Desktop */}
      <div className="hidden lg:flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-secondary">{label}</div>
        <div className="flex items-center pl-px">
          <Ctl p={page - 1} disabled={page <= 1} className="rounded-l-sm gap-1"><ChevronLeft size={14} aria-hidden />Sebelumnya</Ctl>
          {pages(page, total).map((p, i) => p === '…'
            ? <span key={`e${i}`} className={cn(item, 'text-secondary')}>…</span>
            : <Ctl key={p} p={p} current={p === page} ariaLabel={`Halaman ${p}`}>{p}</Ctl>)}
          <Ctl p={page + 1} disabled={page >= total} className="rounded-r-sm gap-1">Berikutnya<ChevronRight size={14} aria-hidden /></Ctl>
        </div>
      </div>
      {/* Mobile */}
      <div className="flex lg:hidden items-center justify-between gap-2">
        <MobileCtl p={page - 1} disabled={page <= 1} ariaLabel="Halaman sebelumnya"><ChevronLeft size={16} aria-hidden />Sebelumnya</MobileCtl>
        <span className="text-sm text-secondary text-center" aria-current="page">{page} / {total}</span>
        <MobileCtl p={page + 1} disabled={page >= total} ariaLabel="Halaman berikutnya">Berikutnya<ChevronRight size={16} aria-hidden /></MobileCtl>
      </div>
    </nav>
  )
}
