import type { RenderModel } from '@/lib/landing/render'
import { SECTION_ANCHORS } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import CmsLink from './CmsLink'
import { ArrowRight } from './icons'
import StoreBadges from './StoreBadges'
import { CONTAINER } from './shared'

const BG = {
  green: { box: 'bg-green-600', c1: 'bg-green-500 opacity-60', c2: 'bg-green-700', title: 'text-white', sub: 'text-green-100', note: 'text-green-200', btn: 'bg-white text-green-800 hover:bg-green-50' },
  dark: { box: 'bg-bark-900', c1: 'bg-bark-800', c2: 'bg-bark-700 opacity-60', title: 'text-white', sub: 'text-sand-200', note: 'text-sand-300', btn: 'bg-white text-bark-900 hover:bg-sand-100' },
  sand: { box: 'bg-sand-100 border border-sand-200', c1: 'bg-sand-200', c2: 'bg-green-100', title: 'text-primary', sub: 'text-clay-600', note: 'text-clay-600', btn: 'bg-green-600 text-white hover:bg-green-700' },
} as const

export default function CtaDownload({ model }: { model: RenderModel }) {
  const { cta, settings } = model.content
  const t = BG[cta.bg]
  const allowed = new Set(cta.badges)
  const stores = cta.showBadges ? model.stores.filter(s => allowed.has(s.key)) : []
  return (
    <section id={SECTION_ANCHORS.cta} aria-labelledby="cta-title" className="bg-page scroll-mt-20">
      <div className={cn(CONTAINER, 'pb-16 lg:pb-28')}>
        <div className={cn('relative overflow-hidden rounded-2xl lg:rounded-[32px] px-6 py-10 lg:px-[88px] lg:py-20 flex flex-col lg:flex-row items-center lg:justify-between gap-6 lg:gap-12 text-center lg:text-left', t.box)}>
          <div aria-hidden className={cn('absolute -right-20 -top-20 w-[220px] h-[220px] lg:-top-[120px] lg:w-[420px] lg:h-[420px] rounded-full', t.c1)} />
          <div aria-hidden className={cn('hidden lg:block absolute right-[180px] -bottom-[180px] w-[300px] h-[300px] rounded-full', t.c2)} />
          <div className="relative max-w-[560px]">
            <h2 id="cta-title" className={cn('m-0 text-[28px] leading-[1.15] lg:text-[44px] lg:leading-[1.12] font-extrabold tracking-[-0.02em]', t.title)}>{cta.title}</h2>
            {cta.subtitle.trim() && <p className={cn('mt-3 lg:mt-4 text-[15px] lg:text-[18px] leading-[1.55]', t.sub)}>{cta.subtitle}</p>}
          </div>
          <div className="relative w-full lg:w-auto flex flex-col items-center lg:items-start gap-3.5 lg:gap-4 shrink-0">
            <CmsLink
              link={cta.button}
              settings={settings}
              className={cn('w-full lg:w-auto inline-flex items-center justify-center gap-2.5 h-[54px] lg:h-14 px-8 rounded-pill text-[16px] font-bold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-600', t.btn)}
            >
              {cta.button.label}
              <ArrowRight />
            </CmsLink>
            {stores.length > 0 && (
              <>
                {cta.badgeLabel.trim() && <span className={cn('text-[13px] font-semibold', t.note)}>{cta.badgeLabel}</span>}
                <StoreBadges stores={stores} variant="onColor" className="justify-center lg:justify-start" />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
