import { isTargetVisible, resolveTarget } from '@/lib/landing/links'
import type { RenderModel } from '@/lib/landing/render'
import { SOCIAL_LABELS, type Social } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { SocialIcon } from './icons'
import { BrandMark } from './SiteHeader'
import { CONTAINER } from './shared'

type LinkView = { id: string; label: string; href: string; external: boolean }

export default function SiteFooter({ model }: { model: RenderModel }) {
  const { footer, header, settings, visibility } = model.content
  const tgUrl = settings.stores.telegram.url.trim()
  const socials: (Social & { href: string })[] = footer.socials
    .map(s => ({ ...s, href: s.platform === 'telegram' ? tgUrl : s.url.trim() }))
    .filter(s => !!s.href)

  const groups = footer.groups.map(g => ({
    id: g.id,
    name: g.name,
    links: g.links
      .filter(l => l.label.trim() && isTargetVisible(l.target, visibility, model.rendered))
      .map((l): LinkView => {
        const r = resolveTarget(l.target, settings)
        return r.kind === 'auto'
          ? { id: l.id, label: l.label, href: r.guestHref, external: false }
          : { id: l.id, label: l.label, href: r.href, external: r.external }
      }),
  })).filter(g => g.links.length > 0)

  const linkCls = 'text-sm lg:text-[15px] text-sand-200 no-underline hover:text-white transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400'
  const groupTitle = 'm-0 mb-3 lg:mb-4 text-[11px] lg:text-xs font-bold uppercase tracking-[0.06em] text-sand-400'
  const extAttrs = (external: boolean) => external ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <footer className="bg-bark-900">
      <div className={cn(CONTAINER, 'pt-12 pb-7 lg:pt-[72px] lg:pb-8')}>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 lg:pb-12 lg:border-b lg:border-white/[0.08]">
          <div className="lg:w-[320px] shrink-0">
            <div className="flex items-center gap-2 lg:gap-2.5">
              <BrandMark name={header.brandName} logoUrl={header.logoUrl} logoClass="w-7 h-7 lg:w-8 lg:h-8" textClass="text-[18px] lg:text-[20px] !text-white" />
            </div>
            {footer.tagline.trim() && <p className="mt-3 lg:mt-3.5 text-sm lg:text-[15px] leading-[1.55] text-sand-300">{footer.tagline}</p>}
            {socials.length > 0 && (
              <ul aria-label="Sosial media" className="list-none p-0 m-0 mt-5 flex gap-2.5 lg:gap-1.5 flex-wrap">
                {socials.map(s => (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${header.brandName} di ${SOCIAL_LABELS[s.platform]}`}
                      title={SOCIAL_LABELS[s.platform]}
                      className="inline-flex items-center justify-center w-11 h-11 lg:w-[34px] lg:h-[34px] rounded-full bg-white/[0.07] text-sand-200 no-underline hover:bg-white/[0.14] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                    >
                      <SocialIcon platform={s.platform} size={20} className="lg:w-[17px] lg:h-[17px]" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={cn('flex-1 grid grid-cols-2 gap-x-4 gap-y-7 lg:gap-8', groups.length >= 4 ? 'lg:grid-cols-4' : groups.length === 2 ? 'lg:grid-cols-2' : groups.length === 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-3')}>
            {groups.map(g => (
              <nav key={g.id} aria-label={g.name}>
                <p className={groupTitle}>{g.name}</p>
                <ul className="list-none m-0 p-0 flex flex-col gap-2.5 lg:gap-3">
                  {g.links.map(l => <li key={l.id}><a href={l.href} {...extAttrs(l.external)} className={linkCls}>{l.label}</a></li>)}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <p className="mt-9 pt-5 border-t border-white/[0.08] lg:mt-7 lg:pt-0 lg:border-t-0 text-center text-xs lg:text-[13px] text-sand-400">{model.copyright}</p>
      </div>
    </footer>
  )
}
