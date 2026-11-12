'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** `exclude`: sub-path with its own nav entry — a sibling item at the parent path must not stay active there. */
export function isNavActive(pathname: string, href: string, exclude?: string) {
  if (exclude && (pathname === exclude || pathname.startsWith(exclude + '/'))) return false
  return pathname === href || (href !== '/admin' && pathname.startsWith(href))
}

interface NavLinkProps {
  href: string
  exclude?: string
  className: (active: boolean) => string
  children: (active: boolean) => React.ReactNode
  /** Callback opsional — dipanggil setelah klik, misal untuk menutup mobile drawer */
  onNavigate?: () => void
}

/**
 * Nav link yang dispatch event 'nav:start' saat diklik
 * supaya NavProgress tahu navigasi dimulai.
 */
export default function NavLink({ href, exclude, className, children, onNavigate }: NavLinkProps) {
  const pathname = usePathname()
  const active = isNavActive(pathname, href, exclude)

  function handleClick() {
    if (!active) {
      document.dispatchEvent(new Event('nav:start'))
    }
    onNavigate?.()
  }

  return (
    <Link prefetch={false} href={href} onClick={handleClick} aria-current={active ? 'page' : undefined} className={className(active)}>
      {children(active)}
    </Link>
  )
}
