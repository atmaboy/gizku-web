'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, Circle } from 'lucide-react'
import NavLink, { isNavActive } from '@/components/admin/NavLink'
import { cn } from '@/lib/utils'
import type { AdminNavCounts } from '@/lib/adminCounts'
import { ADMIN_NAV } from './nav'

function CountBadge({ n, tone }: { n: number; tone: 'danger' | 'warning' }) {
  if (!n) return null
  return (
    <span className={cn(
      'ml-auto inline-flex items-center justify-center min-w-[20px] px-[7px] py-[2px] rounded-pill text-[11px] font-semibold leading-[1.4]',
      tone === 'danger' ? 'bg-rose-600 text-white' : 'bg-warning text-primary',
    )}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

/** Menu list shared by the desktop sidebar and the mobile drawer. */
export default function SidebarNav({ counts, onNavigate, mobile }: { counts: AdminNavCounts; onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname()
  const [openTrees, setOpenTrees] = useState<Record<string, boolean>>({})

  const linkBase = cn(
    'flex items-center gap-2.5 px-3 py-2 rounded-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
    mobile ? 'min-h-11 text-[15px]' : 'min-h-10 text-base',
  )

  return (
    <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
      {ADMIN_NAV.map(entry => {
        if (entry.type === 'header') {
          return <li key={entry.label} className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">{entry.label}</li>
        }
        if (entry.type === 'item') {
          const Icon = entry.icon
          const n = entry.badge ? counts[entry.badge] : 0
          return (
            <li key={entry.href}>
              <NavLink
                href={entry.href}
                onNavigate={onNavigate}
                className={active => cn(linkBase, active ? 'bg-brand text-white shadow-[0_1px_3px_rgba(36,30,25,0.18)]' : 'text-bark-700 hover:bg-muted')}
              >
                {active => (
                  <>
                    <Icon size={18} aria-hidden className={cn('shrink-0', active ? 'text-white' : 'text-clay-500')} />
                    <span className="truncate">{entry.label}</span>
                    {entry.badge && (
                      <>
                        <CountBadge n={n} tone={entry.badge === 'openReports' ? 'danger' : 'warning'} />
                        {n > 0 && <span className="sr-only">({n} menunggu)</span>}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          )
        }
        const Icon = entry.icon
        const childActive = entry.children.some(c => isNavActive(pathname, c.href))
        const open = openTrees[entry.label] ?? true
        const listId = `tree-${entry.label.replace(/\s+/g, '-').toLowerCase()}${mobile ? '-m' : ''}`
        return (
          <li key={entry.label}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpenTrees(s => ({ ...s, [entry.label]: !open }))}
              className={cn(linkBase, 'w-full text-left', childActive ? 'bg-muted text-primary' : 'text-bark-700 hover:bg-muted')}
            >
              <Icon size={18} aria-hidden className={cn('shrink-0', childActive ? 'text-brand' : 'text-clay-500')} />
              <span className="truncate">{entry.label}</span>
              <ChevronDown size={16} aria-hidden className={cn('ml-auto text-secondary transition-transform', !open && '-rotate-90')} />
            </button>
            {open && (
              <ul id={listId} className="flex flex-col gap-0.5 mt-0.5 list-none m-0 p-0">
                {entry.children.map(c => (
                  <li key={c.href}>
                    <NavLink
                      href={c.href}
                      onNavigate={onNavigate}
                      className={active => cn(linkBase, 'pl-[34px]', active ? 'bg-green-50 text-green-800 font-semibold' : 'text-bark-700 hover:bg-muted')}
                    >
                      {active => (
                        <>
                          <Circle size={14} aria-hidden className={cn('shrink-0', active ? 'text-brand' : 'text-clay-500')} />
                          <span className="truncate">{c.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
