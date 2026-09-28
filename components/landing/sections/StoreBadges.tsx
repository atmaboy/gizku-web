import type { StoreKey } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { BrandIcon } from './icons'

/**
 * Download badges. App Store / Google Play follow the official badge layout
 * (black, glyph + two-line wordmark, Indonesian copy from Apple's/Google's
 * localized badges). To switch to the exact artwork files from
 * https://developer.apple.com/app-store/marketing/guidelines/ and
 * https://play.google.com/intl/id/badges/, drop them in /public/badges and
 * swap the inner markup of AppStoreBadge / GooglePlayBadge for an <img>.
 *
 * Only stores that are switched on AND have a URL are passed in (see
 * lib/landing/render.ts) — no dead links (Acceptance #11).
 */

function GooglePlayGlyph({ size }: { size: number }) {
  // Google Play's four-colour mark (brand colours are part of the mark).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M3.6 1.8 13.5 12 3.6 22.2c-.3-.2-.5-.6-.5-1.1V2.9c0-.5.2-.9.5-1.1z" fill="#4285F4" />
      <path d="M3.6 1.8c.3-.2.8-.2 1.3.1l11.6 6.7-3 3.4z" fill="#34A853" />
      <path d="M3.6 22.2 13.5 12l3 3.4-11.6 6.7c-.5.3-1 .3-1.3.1z" fill="#EA4335" />
      <path d="m16.5 8.6 3.6 2.1c.9.5.9 1.3 0 1.8l-3.6 2.1-3-3.4z" fill="#FBBC04" />
    </svg>
  )
}

const LINE1 = { appStore: 'Download di', googlePlay: 'DAPATKAN DI', telegram: 'Kirim foto via' } as const
const LINE2 = { appStore: 'App Store', googlePlay: 'Google Play', telegram: 'Telegram' } as const

export default function StoreBadges({ stores, variant, className }: {
  stores: { key: StoreKey; url: string }[]
  /** `hero` — on the light page background; `onColor` — inside the CTA box. */
  variant: 'hero' | 'onColor'
  className?: string
}) {
  if (stores.length === 0) return null
  const big = variant === 'hero'
  return (
    <ul className={cn('list-none m-0 p-0 flex flex-wrap gap-2 lg:gap-3', className)}>
      {stores.map(s => {
        const light = s.key === 'telegram' && variant === 'hero'
        return (
          <li key={s.key}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${LINE1[s.key]} ${LINE2[s.key]}`}
              className={cn(
                'inline-flex items-center gap-2 lg:gap-2.5 no-underline rounded-[10px] lg:rounded-lg transition-transform hover:-translate-y-px',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
                big ? 'h-[46px] px-3 lg:h-[52px] lg:px-[18px]' : 'h-11 px-3.5 lg:h-12 lg:px-4',
                light
                  ? 'bg-surface border-[1.5px] border-sand-300 text-primary'
                  : 'bg-[var(--black)] text-white border border-white/25',
              )}
            >
              {s.key === 'appStore' && <BrandIcon name="apple" size={big ? 22 : 20} />}
              {s.key === 'googlePlay' && <GooglePlayGlyph size={big ? 22 : 20} />}
              {s.key === 'telegram' && <BrandIcon name="telegram" size={big ? 22 : 20} className={light ? 'text-tgc-500' : undefined} />}
              <span className="flex flex-col leading-[1.1] text-left">
                <span className={cn('text-[9px] lg:text-[10px]', light ? 'text-clay-600' : 'text-sand-200', s.key === 'googlePlay' && 'tracking-[0.04em]')}>{LINE1[s.key]}</span>
                <span className={cn('font-bold tracking-[-0.01em]', big ? 'text-[14px] lg:text-[16px]' : 'text-[14px] lg:text-[15px]')}>{LINE2[s.key]}</span>
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
