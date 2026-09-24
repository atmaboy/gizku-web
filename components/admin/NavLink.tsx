'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function isNavActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href))
}

interface NavLinkProps {
  href: string
  className: (active: boolean) => string
  children: (active: boolean) => React.ReactNode
  /** Callback opsional — dipanggil setelah klik, misal untuk menutup mobile drawer */
  onNavigate?: () => void
}

/**
 * Nav link yang dispatch event 'nav:start' saat diklik
 * supaya NavProgress tahu navigasi dimulai.
 */
export default function NavLink({ href, className, children, onNavigate }: NavLinkProps) {
  const pathname = usePathname()
  const active = isNavActive(pathname, href)

  function handleClick() {
    if (!active) {
      document.dispatchEvent(new Event('nav:start'))
    }
    onNavigate?.()
  }

  return (
    <Link href={href} onClick={handleClick} aria-current={active ? 'page' : undefined} className={className(active)}>
      {children(active)}
    </Link>
  )
}
