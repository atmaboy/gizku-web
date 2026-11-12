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
        <div className="flex bg-surface" style={{ height: 72, paddingTop: 1 }}>
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

        {/* Garis atas bar + notch melengkung di sekeliling FAB (kamera "floating") */}
        <div className="absolute top-0 left-0 right-0 flex items-start pointer-events-none" aria-hidden>
          <div className="flex-1" style={{ height: 1, background: 'var(--color-border-default)' }} />
          <svg width="120" height="52" viewBox="0 0 120 52" style={{ display: 'block', flexShrink: 0 }}>
            <path
              d="M 0 0.5 L 18 0.5 A 8 8 0 0 1 25.91 9.72 A 34.5 34.5 0 1 0 94.09 9.72 A 8 8 0 0 1 102 0.5 L 120 0.5"
              fill="var(--color-bg-page)"
              stroke="var(--color-border-default)"
              strokeWidth="1"
            />
          </svg>
          <div className="flex-1" style={{ height: 1, background: 'var(--color-border-default)' }} />
        </div>

        <button
          type="button"
          onClick={openCaptureMenu}
          aria-label={t('nav.captureAriaLabel')}
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full bg-brand cursor-pointer"
          style={{ top: -26, width: 56, height: 56, boxShadow: '0 8px 18px -2px rgba(61,120,51,.45), 0 3px 6px rgba(36,30,25,.14)' }}
        >
          <IconCamera size={22} color="#fff" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
