'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconHistory, IconSettings, IconCamera } from './icons'

const TABS = [
  { href: '/main/riwayat', label: 'Riwayat', icon: IconHistory },
  { href: '/main/settings', label: 'Pengaturan', icon: IconSettings },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative">
        <div
          className="flex bg-surface border-t"
          style={{ borderColor: 'var(--color-border-default)', height: 72 }}
        >
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-1"
              >
                <Icon size={20} color={active ? 'var(--color-text-brand)' : 'var(--color-text-secondary)'} />
                <span
                  className="text-2xs"
                  style={{ color: active ? 'var(--color-text-brand)' : 'var(--color-text-secondary)', fontWeight: active ? 600 : 500 }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>

        <Link
          href="/main/catat"
          aria-label="Catat makanan baru"
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full bg-brand shadow-md"
          style={{ top: -26, width: 56, height: 56 }}
        >
          <IconCamera size={22} color="#fff" strokeWidth={1.8} />
        </Link>
      </div>
    </div>
  )
}
