'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthState } from '@/lib/hooks/useAuthState'

function UserAvatar({ username }: { username: string }) {
  const initial = username.slice(0, 1).toUpperCase()
  return (
    <Link
      href="/main/riwayat"
      aria-label={`Profil ${username} — buka aplikasi`}
      title={username}
      className="flex items-center gap-2 pl-1.5 pr-3.5 h-11 rounded-pill bg-brand-tint no-underline shrink-0"
    >
      <span className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">{initial}</span>
      <span className="text-sm font-semibold text-primary max-w-[120px] truncate hidden sm:inline">{username}</span>
    </Link>
  )
}

/* ─── Nav's right-side login state — the only part of the nav that depends
       on localStorage, so it's the only client island in an otherwise
       server-rendered nav bar. Pre-hydration it renders the same "Buka
       Aplikasi" button the server sent. ── */
export default function NavAuthArea() {
  const router = useRouter()
  const { hydrated, isLoggedIn, username } = useAuthState()

  if (hydrated && isLoggedIn && username) {
    return <UserAvatar username={username} />
  }

  return (
    <button
      onClick={() => router.push('/login')}
      aria-label="Buka Aplikasi Gizku"
      className="h-11 px-5 lg:px-6 rounded-pill bg-brand text-onbrand text-sm font-semibold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
    >
      Buka Aplikasi
    </button>
  )
}
