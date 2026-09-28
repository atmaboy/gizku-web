import type { RenderModel } from '@/lib/landing/render'
import { SECTION_ANCHORS, type Feature } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { LandingIcon } from './icons'
import { FeatureVisual } from './Mockups'
import { CONTAINER, SectionHeading } from './shared'

function FeatureCard({ f }: { f: Feature }) {
  return (
    <article className="p-5 lg:p-7 rounded-2xl lg:rounded-[18px] bg-surface shadow-[0_8px_24px_rgba(36,30,25,0.07)] lg:shadow-[0_10px_30px_rgba(36,30,25,0.08)] flex gap-3.5 lg:gap-5 text-left">
      <span className="w-11 h-11 lg:w-[52px] lg:h-[52px] shrink-0 rounded-xl lg:rounded-[14px] bg-green-50 text-green-600 flex items-center justify-center">
        <LandingIcon name={f.icon} size={24} className="w-[22px] h-[22px] lg:w-6 lg:h-6" />
      </span>
      <div className="min-w-0">
        <h3 className="m-0 text-[16px] lg:text-[19px] font-bold text-primary">{f.title}</h3>
        <p className="mt-1.5 lg:mt-2 text-sm lg:text-[15px] leading-[1.5] lg:leading-[1.55] text-clay-600">{f.description}</p>
      </div>
    </article>
  )
}

export default function Features({ model }: { model: RenderModel }) {
  const x = model.content.features
  const rows = x.rows.map((r, i) => ({ ...r, i })).filter(r => r.items.length > 0)
  return (
    <section id={SECTION_ANCHORS.features} aria-labelledby="fitur-title" className="bg-sunken scroll-mt-20">
      <div className={cn(CONTAINER, 'py-16 lg:py-28')}>
        <SectionHeading id="fitur-title" eyebrow={x.eyebrow} title={x.title} subtitle={x.subtitle} />
        {rows.map((row, idx) => (
          <div
            key={row.i}
            className={cn(
              'flex flex-col lg:flex-row lg:items-center gap-7 lg:gap-[72px]',
              idx === 0 ? 'mt-8 lg:mt-[72px]' : 'mt-12 lg:mt-24',
              // Row 1: visual left · Row 2: visual right (desktop). Mobile: visual first.
              row.i === 1 && 'lg:flex-row-reverse',
            )}
          >
            <FeatureVisual visual={row.visual} />
            <div className="flex-1 min-w-0 flex flex-col gap-3.5 lg:gap-6">
              {row.items.map(f => <FeatureCard key={f.id} f={f} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
