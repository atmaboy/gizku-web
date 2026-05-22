'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import NavProgress from '@/components/admin/NavProgress'

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
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="1.5" y="1.5" width="25" height="25" rx="10" fill="#EAFBF1" stroke="#BBF7D0"/>
                <path d="M8 12.5C8 16.09 10.91 19 14.5 19H18.5C18.78 19 19 18.78 19 18.5C19 18.22 18.78 18 18.5 18H14.5C11.46 18 9 15.54 9 12.5V11.75C9 11.34 9.34 11 9.75 11H20.25C20.66 11 21 11.34 21 11.75V12.5C21 13.33 20.33 14 19.5 14H18" stroke="#2ECC71" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 9C11.6 7.8 12.7 7 14 7C15.1 7 16.1 7.6 16.7 8.5" stroke="#2ECC71" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M13 14.2L14.4 15.6L17.4 12.6" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
