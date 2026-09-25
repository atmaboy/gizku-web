import {
  LayoutGrid, Users, History, Gauge, MessageSquare, Bell, Send, Globe, Settings, type LucideIcon,
} from 'lucide-react'
import type { AdminNavCounts } from '@/lib/adminCounts'

export type NavEntry =
  | { type: 'item'; label: string; icon: LucideIcon; href: string; badge?: keyof AdminNavCounts }
  | { type: 'header'; label: string }
  | { type: 'tree'; label: string; icon: LucideIcon; children: { label: string; href: string }[] }

export const ADMIN_NAV: NavEntry[] = [
  { type: 'item',   label: 'Dashboard',          icon: LayoutGrid,    href: '/admin' },
  { type: 'header', label: 'Pengguna' },
  { type: 'item',   label: 'Manajemen User',     icon: Users,         href: '/admin/users' },
  { type: 'item',   label: 'Riwayat Analisa',    icon: History,       href: '/admin/riwayat' },
  { type: 'item',   label: 'Request Limit',      icon: Gauge,         href: '/admin/limit',   badge: 'pendingLimit' },
  { type: 'header', label: 'Komunikasi' },
  { type: 'item',   label: 'Laporan & Helpdesk', icon: MessageSquare, href: '/admin/reports', badge: 'openReports' },
  { type: 'item',   label: 'Blast Notifikasi',   icon: Bell,          href: '/admin/blast' },
  { type: 'item',   label: 'Telegram Bot',       icon: Send,          href: '/admin/telegram' },
  { type: 'header', label: 'Konten Website' },
  { type: 'tree',   label: 'Halaman Publik',     icon: Globe, children: [
      { label: 'Landing Page',  href: '/admin/landing' },
      { label: 'Footer',        href: '/admin/footer' },
      { label: 'Dokumen Legal', href: '/admin/legal' } ] },
  { type: 'header', label: 'Sistem' },
  { type: 'item',   label: 'Pengaturan',         icon: Settings,      href: '/admin/config' },
]

/** Environment label for the sidebar footer — same source as StagingBanner. */
export function getEnvInfo(): { label: string; tone: 'production' | 'staging' } | null {
  const env = process.env.NEXT_PUBLIC_APP_ENV
  if (env === 'staging' || env === 'preview') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
    return { label: ref ? `Staging · ${ref}` : 'Staging', tone: 'staging' }
  }
  if (env === 'production') return { label: 'Production', tone: 'production' }
  return null
}

export async function adminLogout() {
  try { await fetch('/api/admin?action=logout', { method: 'POST' }) } catch { /* cookie is cleared client-side below anyway */ }
  document.cookie = 'nl_admin_token=; path=/; max-age=0'
}
