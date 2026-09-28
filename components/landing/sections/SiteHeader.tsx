import GizkuLogo from '@/components/GizkuLogo'
import NavAuthArea from '@/components/landing/NavAuthArea'
import { isTargetVisible, resolveTarget } from '@/lib/landing/links'
import type { RenderModel } from '@/lib/landing/render'
import { cn } from '@/lib/utils'
import MobileMenu from './MobileMenu'
import { CONTAINER } from './shared'

export type NavLinkView = { id: string; label: string; href: string; external: boolean }

export function BrandMark({ name, logoUrl, logoClass, textClass }: { name: string; logoUrl: string | null; logoClass: string; textClass: string }) {
  return (
    <>
      {logoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={logoUrl} alt="" width={36} height={36} className={cn('shrink-0 rounded-[22%] object-contain', logoClass)} />
        : <GizkuLogo size={36} className={cn('shrink-0', logoClass)} />}
      <span className={cn('font-bold tracking-[-0.02em] text-primary', textClass)}>{name}</span>
    </>
  )
}

export default function SiteHeader({ model }: { model: RenderModel }) {
  const { header, settings } = model.content
  const links: NavLinkView[] = header.nav
    .filter(n => n.active && n.label.trim() && isTargetVisible(n.target, model.content.visibility, model.rendered))
    .map(n => {
      const r = resolveTarget(n.target, settings)
      return r.kind === 'auto'
        ? { id: n.id, label: n.label, href: r.guestHref, external: false }
        : { id: n.id, label: n.label, href: r.href, external: r.external }
    })
  const btn = resolveTarget(header.button.target, settings)
  const guestHref = btn.kind === 'auto' ? btn.guestHref : btn.href
  const authHref = btn.kind === 'auto' ? btn.authHref : (settings.ctaUrlAuth || '/main/riwayat')

  return (
    <header
      className={cn('z-40 border-b border-sand-200 backdrop-blur', header.sticky ? 'sticky top-[var(--staging-banner-h,0px)]' : 'relative')}
      style={{ background: 'color-mix(in srgb, var(--sand-25) 92%, transparent)' }}
    >
      <div className={cn(CONTAINER, 'flex items-center justify-between h-16 lg:h-20 pr-3 lg:pr-10')}>
        <a href="#top" aria-label={`${header.brandName} beranda`} className="flex items-center gap-2 lg:gap-2.5 no-underline shrink-0">
          <BrandMark name={header.brandName} logoUrl={header.logoUrl} logoClass="w-8 h-8 lg:w-9 lg:h-9" textClass="text-[19px] lg:text-[22px]" />
        </a>

        {links.length > 0 && (
          <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-9">
            {links.map(l => (
              <a
                key={l.id}
                href={l.href}
                {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-[15px] font-medium text-clay-600 no-underline hover:text-green-700 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-1 lg:gap-0">
          <span className="hidden lg:inline-flex">
            <NavAuthArea label={header.button.label} guestHref={guestHref} authHref={authHref} />
          </span>
          <span className="inline-flex lg:hidden">
            <NavAuthArea label={header.button.label} guestHref={guestHref} authHref={authHref} compact />
          </span>
          {links.length > 0 && (
            <MobileMenu
              links={links}
              brandName={header.brandName}
              button={{ label: header.button.label, guestHref, authHref }}
            />
          )}
        </div>
      </div>
    </header>
  )
}
