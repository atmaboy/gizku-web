'use client'

import { useAuthState } from '@/lib/hooks/useAuthState'
import { cn } from '@/lib/utils'

function UserAvatar({ username, href, compact }: { username: string; href: string; compact?: boolean }) {
  const initial = username.slice(0, 1).toUpperCase()
  return (
    <a
      href={href}
      aria-label={`Profil ${username} — buka aplikasi`}
      title={username}
      className={cn('flex items-center gap-2 pl-1.5 pr-3.5 rounded-pill bg-brand-tint no-underline shrink-0', compact ? 'h-10' : 'h-11')}
    >
      <span className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">{initial}</span>
      <span className="text-sm font-semibold text-primary max-w-[120px] truncate hidden sm:inline">{username}</span>
    </a>
  )
}

/* ─── Header's right-side button — the only part of the header that depends
       on localStorage. Logged-in visitors see their avatar + username instead
       of the button. Pre-hydration it renders the same button the server
       sent, so there's no layout shift for guests. ── */
export default function NavAuthArea({ label, guestHref, authHref, compact, className }: {
  label: string
  guestHref: string
  authHref: string
  compact?: boolean
  className?: string
}) {
  const { hydrated, isLoggedIn, username } = useAuthState()

  if (hydrated && isLoggedIn && username) {
    return <UserAvatar username={username} href={authHref} compact={compact} />
  }

  return (
    <a
      href={guestHref}
      className={cn(
        'inline-flex items-center rounded-pill bg-brand text-onbrand font-semibold whitespace-nowrap no-underline hover:bg-brand-hover transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
        compact ? 'h-10 px-4 text-[14px]' : 'h-11 px-6 text-[15px]',
        className,
      )}
    >
      {label}
    </a>
  )
}
