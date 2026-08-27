'use client'
import { useRouter } from 'next/navigation'
import NavLink from '@/components/admin/NavLink'
import GizkuLogo from '@/components/GizkuLogo'

const nav = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'User',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
  },
  {
    href: '/admin/riwayat',
    label: 'Riwayat',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v5h5"/>
        <path d="M3.05 13a9 9 0 1 0 2.13-6.36L3 8"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    ),
  },
  {
    href: '/admin/reports',
    label: 'Laporan',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/admin/blast',
    label: 'Blast Notifikasi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/admin/landing',
    label: 'Landing Page',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M9 21V9"/>
      </svg>
    ),
  },
  {
    href: '/admin/footer',
    label: 'Footer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 15h18"/>
      </svg>
    ),
  },
  {
    href: '/admin/legal',
    label: 'Dokumen Legal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7z"/>
        <path d="M14 3v4h4"/>
        <path d="M9.5 12h5M9.5 15.5h5"/>
      </svg>
    ),
  },
  {
    href: '/admin/telegram',
    label: 'Telegram Bot',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21.5 4.5L2.5 10.5l6.5 2.5m12.5-8.5l-8 9m8-9L10 14.5m0 0v5l3.5-3.5"/>
      </svg>
    ),
  },
  {
    href: '/admin/limit',
    label: 'Request Limit',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0-9-9c0 2.1.7 4 1.9 5.6"/>
        <path d="M12 12 16 8"/>
        <path d="M12 21v-1M4.2 15l.9-.4M19.8 15l-.9-.4"/>
      </svg>
    ),
  },
  {
    href: '/admin/config',
    label: 'Pengaturan',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/>
      </svg>
    ),
  },
]

interface AdminSidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const router = useRouter()

  function logout() {
    document.cookie = 'nl_admin_token=; path=/; max-age=0'
    router.push('/admin/login')
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#E5E7EB]">
        <GizkuLogo size={28} />
        <div>
          <span className="font-semibold text-[15px] text-[#111827] tracking-[-0.01em]">Gizku</span>
          <p className="text-[11px] text-[#6B7280] leading-none mt-0.5">AI Nutrition Companion</p>
        </div>
        <span className="ml-auto text-[11px] bg-[#D4F5E4] text-[#1F9D57] px-2 py-0.5 rounded-full font-medium">Admin</span>
        <button
          onClick={onMobileClose}
          className="ml-2 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F3F4F6] transition-colors md:hidden"
          aria-label="Tutup menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-3" aria-label="Menu admin">
        {nav.map(n => (
          <NavLink
            key={n.href}
            href={n.href}
            label={n.label}
            icon={n.icon}
            onNavigate={onMobileClose}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#E5E7EB]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[#6B7280] hover:text-red-500 hover:bg-red-50 transition-colors min-h-[44px]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 border-r border-[#E5E7EB] bg-white flex-col">
        {sidebarContent}
      </aside>
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white flex flex-col
          shadow-xl border-r border-[#E5E7EB]
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-modal="true"
        role="dialog"
        aria-label="Navigasi admin"
      >
        {sidebarContent}
      </aside>
    </>
  )
}
