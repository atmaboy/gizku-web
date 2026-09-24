'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ExternalLink, LogOut, Menu, X } from 'lucide-react'
import GizkuLogo from '@/components/GizkuLogo'
import NavProgress from '@/components/admin/NavProgress'
import { Button, useDialogBehavior } from '@/components/admin/ui'
import { cn } from '@/lib/utils'
import type { AdminNavCounts } from '@/lib/adminCounts'
import SidebarNav from './SidebarNav'
import UserMenu from './UserMenu'
import { adminLogout, getEnvInfo } from './nav'

const iconBtn = 'inline-flex items-center justify-center rounded-sm text-bark-700 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500'

function Brand({ size = 32, textClass = 'text-[19px]' }: { size?: number; textClass?: string }) {
  return (
    <>
      <GizkuLogo size={size} className="shrink-0" />
      <span className={cn('text-primary tracking-[-0.01em] whitespace-nowrap', textClass)}>
        <strong className="font-bold">Gizku</strong> <span className="font-light">Admin</span>
      </span>
    </>
  )
}

function EnvStatus() {
  const env = getEnvInfo()
  if (!env) return null
  return (
    <div className="px-[18px] py-3 border-t border-border text-xs text-secondary flex items-center gap-2">
      <span aria-hidden className={cn('w-2 h-2 rounded-full shrink-0', env.tone === 'production' ? 'bg-green-500' : 'bg-honey-500')} />
      <span className="truncate">{env.label}</span>
    </div>
  )
}

function BellLink({ n, size }: { n: number; size: 'desktop' | 'mobile' }) {
  return (
    <Link
      href="/admin/reports"
      aria-label={n > 0 ? `${n} laporan perlu dibalas` : 'Laporan & Helpdesk'}
      className={cn(iconBtn, 'relative', size === 'desktop' ? 'w-10 h-10' : 'w-11 h-11')}
    >
      <Bell size={19} aria-hidden />
      {n > 0 && (
        <span aria-hidden className="absolute top-1 right-[3px] min-w-[18px] h-[18px] px-1 rounded-pill bg-warning text-primary text-[11px] font-bold leading-[18px] text-center">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  )
}

function Drawer({ open, onClose, counts, onLogout }: { open: boolean; onClose: () => void; counts: AdminNavCounts; onLogout: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogBehavior(open, onClose, panelRef)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <div className={cn('fixed inset-0 z-[90] lg:hidden', !open && 'pointer-events-none')} aria-hidden={!open} inert={!open}>
      <div
        className={cn('absolute inset-0 bg-bark-900/45 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigasi admin"
        tabIndex={-1}
        className={cn(
          'absolute bottom-0 top-[var(--staging-banner-h,0px)] left-0 w-[292px] max-w-[85vw] bg-surface shadow-[4px_0_24px_rgba(36,30,25,0.18)] flex flex-col transition-transform duration-200 ease-out focus:outline-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-14 pl-4 pr-1.5 border-b border-border flex items-center gap-2.5 shrink-0">
          <Brand size={28} textClass="text-lg" />
          <button type="button" onClick={onClose} aria-label="Tutup menu" className={cn(iconBtn, 'ml-auto w-11 h-11')}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav aria-label="Menu admin" className="flex-1 overflow-y-auto px-2.5 pt-2.5 pb-4">
          <SidebarNav counts={counts} onNavigate={onClose} mobile />
        </nav>
        <EnvStatus />
        <div className="p-3 border-t border-border">
          <Button variant="outline-danger" icon={LogOut} fullWidth onClick={onLogout}>Keluar</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.2.0'

export default function AdminShell({ counts: initialCounts, children }: { counts: AdminNavCounts; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState(initialCounts)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)

  // Layouts don't re-render on client navigation, so refresh badge counts
  // (cheap COUNT queries) whenever the route changes or a page signals a change.
  const refreshCounts = useCallback(async () => {
    try {
      const r = await fetch('/api/admin?action=nav_counts', { cache: 'no-store' })
      if (r.ok) setCounts(await r.json())
    } catch { /* keep last known counts */ }
  }, [])
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    refreshCounts()
  }, [pathname, refreshCounts])
  useEffect(() => {
    const h = () => refreshCounts()
    document.addEventListener('admin:counts', h)
    return () => document.removeEventListener('admin:counts', h)
  }, [refreshCounts])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  async function logout() {
    setDrawerOpen(false)
    await adminLogout()
    router.push('/admin/login')
  }

  const year = new Date().getFullYear()

  return (
    <div className="flex min-h-screen bg-sunken pt-[var(--staging-banner-h,0px)]">
      <NavProgress />
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-surface focus:px-3 focus:py-2 focus:rounded-sm focus:shadow-md focus:text-link">
        Lewati ke konten
      </a>

      {/* Desktop sidebar */}
      <aside
        aria-label="Navigasi admin"
        className={cn('hidden w-sidebar shrink-0 bg-surface border-r border-border flex-col sticky top-[var(--staging-banner-h,0px)] h-[calc(100vh-var(--staging-banner-h,0px))]', !sidebarHidden && 'lg:flex')}
      >
        <Link href="/admin" className="h-navbar px-[18px] border-b border-border flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500">
          <Brand />
        </Link>
        <nav aria-label="Menu admin" className="flex-1 overflow-y-auto px-2.5 pt-2.5 pb-4">
          <SidebarNav counts={counts} />
        </nav>
        <EnvStatus />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Desktop navbar */}
        <header className="hidden lg:flex h-navbar bg-surface border-b border-border px-4 items-center gap-1 sticky top-[var(--staging-banner-h,0px)] z-30">
          <button
            type="button"
            onClick={() => setSidebarHidden(h => !h)}
            aria-label="Tampilkan atau sembunyikan sidebar"
            aria-expanded={!sidebarHidden}
            className={cn(iconBtn, 'w-10 h-10')}
          >
            <Menu size={20} aria-hidden />
          </button>
          <Link href="/admin" className="text-base text-bark-700 px-3 py-2 rounded-sm hover:bg-muted">Beranda</Link>
          <a href="https://gizku.com" target="_blank" rel="noopener" className="text-base text-bark-700 px-3 py-2 rounded-sm hover:bg-muted inline-flex items-center gap-1.5">
            Lihat Situs <ExternalLink size={13} aria-hidden />
          </a>
          <div className="flex-1" />
          <BellLink n={counts.openReports} size="desktop" />
          <UserMenu />
        </header>

        {/* Mobile app bar */}
        <header className="lg:hidden h-14 px-1.5 bg-surface border-b border-border flex items-center gap-0.5 sticky top-[var(--staging-banner-h,0px)] z-30">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
            className={cn(iconBtn, 'w-11 h-11')}
          >
            <Menu size={22} aria-hidden />
          </button>
          <Link href="/admin" className="flex items-center gap-2 min-w-0 px-1">
            <Brand size={28} textClass="text-lg" />
          </Link>
          <div className="flex-1" />
          <BellLink n={counts.openReports} size="mobile" />
          <UserMenu compact />
        </header>

        <main id="admin-main" className="flex-1 min-w-0" tabIndex={-1}>
          {children}
        </main>

        <footer className="bg-surface border-t border-border px-6 py-3.5 flex justify-between gap-2 text-base text-secondary max-lg:px-4 max-lg:flex-col max-lg:items-center max-lg:text-xs max-lg:text-center max-lg:gap-0.5">
          <div>
            <strong className="font-semibold text-primary">Copyright © {year} <a href="https://gizku.com" className="text-link hover:text-green-800">Gizku</a>.</strong> Hak cipta dilindungi.
          </div>
          <div><strong className="font-semibold text-primary">Versi</strong> {APP_VERSION}</div>
        </footer>
      </div>

      <Drawer open={drawerOpen} onClose={closeDrawer} counts={counts} onLogout={logout} />
    </div>
  )
}
