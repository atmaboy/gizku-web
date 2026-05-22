'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  label: string
  icon: React.ReactNode
  /** Callback opsional — dipanggil setelah klik, misal untuk menutup mobile drawer */
  onNavigate?: () => void
}

/**
 * Nav link yang dispatch event 'nav:start' saat diklik
 * supaya NavProgress tahu navigasi dimulai.
 */
export default function NavLink({ href, label, icon, onNavigate }: NavLinkProps) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))

  function handleClick() {
    if (!active) {
      document.dispatchEvent(new Event('nav:start'))
    }
    onNavigate?.()
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
        active
          ? 'bg-[#D4F5E4] text-[#1F9D57]'
          : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
      }`}
    >
      <span className={active ? 'text-[#2ECC71]' : 'text-[#9CA3AF]'}>{icon}</span>
      {label}
    </Link>
  )
}
