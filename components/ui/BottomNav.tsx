'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconHistory, IconSettings, IconCamera } from './icons'
import { useCapture } from '@/components/capture/CaptureContext'
import { useTranslation } from '@/lib/i18n/LanguageContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { openCaptureMenu } = useCapture()
  const { t } = useTranslation()

  const TABS = [
    { href: '/main/riwayat', label: t('nav.riwayat'), icon: IconHistory },
    { href: '/main/settings', label: t('nav.settings'), icon: IconSettings },
  ] as const

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

        <button
          type="button"
          onClick={openCaptureMenu}
          aria-label={t('nav.captureAriaLabel')}
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full bg-brand shadow-md cursor-pointer"
          style={{ top: -26, width: 56, height: 56 }}
        >
          <IconCamera size={22} color="#fff" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
