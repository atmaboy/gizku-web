import type { RenderModel } from '@/lib/landing/render'
import { SECTION_ANCHORS } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { LandingIcon } from './icons'
import { CONTAINER, SectionHeading } from './shared'

export default function HowItWorks({ model }: { model: RenderModel }) {
  const x = model.content.howItWorks
  const cols = x.items.length >= 4 ? 'lg:grid-cols-4' : x.items.length === 2 ? 'lg:grid-cols-2' : x.items.length === 1 ? 'lg:grid-cols-1 lg:max-w-[420px] lg:mx-auto' : 'lg:grid-cols-3'
  return (
    <section id={SECTION_ANCHORS.howItWorks} aria-labelledby="cara-kerja-title" className="bg-surface scroll-mt-20">
      <div className={cn(CONTAINER, 'py-16 lg:py-28')}>
        <SectionHeading id="cara-kerja-title" eyebrow={x.eyebrow} title={x.title} subtitle={x.subtitle} />
        <ol className={cn('list-none p-0 mt-8 lg:mt-16 grid grid-cols-1 gap-3.5 lg:gap-8', cols)}>
          {x.items.map((s, i) => (
            <li key={s.id} className="relative rounded-[20px] lg:rounded-2xl bg-sunken p-6 lg:px-8 lg:py-10 flex lg:flex-col gap-4 lg:gap-0 items-start lg:items-center text-left lg:text-center">
              {x.showNumbers && (
                <span className="hidden lg:block absolute top-5 left-6 text-[13px] font-bold text-clay-500" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
              )}
              <span className="w-[52px] h-[52px] lg:w-[72px] lg:h-[72px] rounded-2xl lg:rounded-[22px] bg-green-600 text-white flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(61,120,51,0.25)]">
                <LandingIcon name={s.icon} size={32} strokeWidth={1.7} className="w-6 h-6 lg:w-8 lg:h-8" />
              </span>
              <div className="min-w-0">
                {x.showNumbers && <span className="lg:hidden text-xs font-bold text-clay-500">{String(i + 1).padStart(2, '0')}</span>}
                <h3 className="mt-0.5 lg:mt-6 text-[17px] lg:text-xl font-bold text-primary">{s.title}</h3>
                <p className="mt-1.5 lg:mt-2.5 text-sm lg:text-[15px] leading-[1.5] lg:leading-[1.55] text-clay-600">{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
