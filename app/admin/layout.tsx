'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import NavProgress from '@/components/admin/NavProgress'
import GizkuLogo from '@/components/GizkuLogo'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {!isLoginPage && <NavProgress />}

      {/* Sidebar desktop — hidden di mobile */}
      {!isLoginPage && (
        <AdminSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      {/* Overlay backdrop saat mobile drawer terbuka */}
      {!isLoginPage && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`${
        isLoginPage ? 'w-full' : 'flex-1 min-w-0 flex flex-col'
      }`}>
        {/* Mobile topbar — hanya tampil di mobile */}
        {!isLoginPage && (
          <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E5E7EB] md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#F3F4F6] transition-colors"
              aria-label="Buka menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            {/* Logo mini di topbar mobile */}
            <div className="flex items-center gap-2">
              <GizkuLogo size={22} />
              <span className="font-semibold text-[15px] text-[#111827]">Gizku</span>
              <span className="text-[11px] bg-[#D4F5E4] text-[#1F9D57] px-2 py-0.5 rounded-full font-medium">Admin</span>
            </div>
          </header>
        )}

        <main className={`${
          isLoginPage
            ? 'w-full'
            : 'flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6'
        }`}>
          {children}
        </main>
      </div>
    </div>
  )
}
