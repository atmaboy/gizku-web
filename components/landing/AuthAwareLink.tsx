'use client'

import { useAuthState } from '@/lib/hooks/useAuthState'

/* ─── A link whose href depends on login state (guest → guestHref,
       logged in → authHref) — the builder's "Otomatis" target. The only part
       that needs the browser (localStorage), so it's a tiny client island.
       Pre-hydration it links to guestHref, matching the server markup. ── */
export default function AuthAwareLink({
  guestHref,
  authHref,
  className,
  children,
  ariaLabel,
}: {
  guestHref: string
  authHref: string
  className?: string
  children: React.ReactNode
  ariaLabel?: string
}) {
  const { hydrated, isLoggedIn } = useAuthState()
  const href = hydrated && isLoggedIn ? authHref : guestHref
  return (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  )
}
