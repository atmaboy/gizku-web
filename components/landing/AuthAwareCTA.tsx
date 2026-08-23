'use client'

import Link from 'next/link'
import { useAuthState } from '@/lib/hooks/useAuthState'

/* ─── Hero/bottom CTA — href depends on login state (guest → /login,
       logged-in → straight into the app), so it's a small client island.
       Pre-hydration it links to guestHref, matching the server-rendered
       markup. ── */
export default function AuthAwareCTA({
  guestHref,
  authHref,
  label,
  ariaLabel,
  className,
  note,
}: {
  guestHref: string
  authHref: string
  label: string
  ariaLabel: string
  className: string
  note?: string
}) {
  const { hydrated, isLoggedIn } = useAuthState()
  const href = hydrated && isLoggedIn ? authHref : guestHref

  return (
    <>
      <Link href={href} aria-label={ariaLabel} className={className}>
        {label} →
      </Link>
      {note && <p className="text-xs text-tertiary mt-4">{note}</p>}
    </>
  )
}
