import { Sparkles } from 'lucide-react'
import type { RenderModel } from '@/lib/landing/render'
import { SECTION_ANCHORS } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import CmsLink from './CmsLink'
import { ArrowRight, CheckIcon } from './icons'
import { HeroVisual } from './Mockups'
import StoreBadges from './StoreBadges'
import { CONTAINER } from './shared'

export const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2.5 h-[54px] lg:h-14 px-8 rounded-pill bg-green-600 text-white text-[16px] font-bold no-underline whitespace-nowrap shadow-[0_4px_16px_rgba(61,120,51,0.28)] hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2'
const BTN_SECONDARY = 'inline-flex items-center justify-center h-[54px] lg:h-14 px-7 rounded-pill border-[1.5px] border-sand-300 bg-surface text-primary text-[16px] font-semibold no-underline whitespace-nowrap hover:border-green-600 hover:text-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2'

export default function Hero({ model }: { model: RenderModel }) {
  const { hero, settings } = model.content
  const [first, ...rest] = hero.title.split('\n')
  const second = rest.join(' ').trim()
  const stores = hero.showStoreBadges ? model.stores : []
  const secondary = hero.secondary && hero.secondary.label.trim() ? hero.secondary : null

  return (
    <section id={SECTION_ANCHORS.hero} aria-labelledby="hero-title" className="bg-page scroll-mt-20">
      <div className={cn(CONTAINER, 'flex flex-col lg:flex-row items-center gap-9 lg:gap-12 pt-9 pb-12 lg:pt-16 lg:pb-[88px]')}>
        <div className="flex-1 min-w-0 flex flex-col items-center text-center lg:items-start lg:text-left">
          {hero.eyebrow.trim() && (
            <span className="inline-flex items-center gap-1.5 lg:gap-2 px-3.5 py-[7px] lg:px-4 lg:py-2 rounded-pill bg-green-50 border border-green-200 text-green-700 text-[11px] lg:text-xs font-bold uppercase tracking-[0.06em]">
              <Sparkles size={14} strokeWidth={2} aria-hidden />
              {hero.eyebrow}
            </span>
          )}
          <h1 id="hero-title" className="mt-5 lg:mt-7 text-[36px] leading-[1.12] lg:text-[48px] xl:text-[60px] lg:leading-[1.08] font-extrabold tracking-[-0.03em] text-primary">
            {first}
            {second && <>{' '}<span className="text-green-600 lg:block">{second}</span></>}
          </h1>
          {hero.subtitle.trim() && (
            <p className="mt-4 lg:mt-6 max-w-[520px] text-[16px] lg:text-[19px] leading-[1.55] text-clay-600">{hero.subtitle}</p>
          )}
          <div className="mt-6 lg:mt-9 w-full lg:w-auto flex flex-col lg:flex-row gap-2.5 lg:gap-3 lg:items-center">
            <CmsLink link={hero.primary} settings={settings} className={BTN_PRIMARY}>
              {hero.primary.label}
              <ArrowRight />
            </CmsLink>
            {secondary && <CmsLink link={secondary} settings={settings} className={BTN_SECONDARY} />}
          </div>
          {hero.benefits.length > 0 && (
            <ul className="mt-5 lg:mt-7 list-none p-0 flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-2.5 lg:gap-6">
              {hero.benefits.map(b => (
                <li key={b} className="flex items-center gap-1.5 lg:gap-2 text-[13px] lg:text-sm font-semibold text-bark-700">
                  <span className="w-[18px] h-[18px] lg:w-5 lg:h-5 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><CheckIcon /></span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {stores.length > 0 && (
            <div className="mt-6 lg:mt-10 lg:pt-7 lg:border-t lg:border-sand-200 flex flex-col items-center lg:items-start gap-3.5 lg:self-stretch">
              <span className="hidden lg:block text-[13px] font-semibold text-clay-600">Juga tersedia di</span>
              <StoreBadges stores={stores} variant="hero" className="justify-center lg:justify-start" />
            </div>
          )}
        </div>
        <HeroVisual visual={hero.visual} />
      </div>
    </section>
  )
}
