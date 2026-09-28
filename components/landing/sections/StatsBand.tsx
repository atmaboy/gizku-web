import type { RenderModel } from '@/lib/landing/render'
import { SECTION_ANCHORS, type StatItem } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { CONTAINER } from './shared'

const BAND = {
  green: { bg: 'bg-green-700', intro: 'text-green-100', value: 'text-white', label: 'text-green-200', divider: 'lg:border-white/20' },
  sand: { bg: 'bg-sand-100 border-y border-sand-200', intro: 'text-bark-800', value: 'text-green-700', label: 'text-clay-600', divider: 'lg:border-sand-300' },
  dark: { bg: 'bg-bark-900', intro: 'text-sand-200', value: 'text-white', label: 'text-sand-300', divider: 'lg:border-white/15' },
} as const

/** Displayed value: frozen count for automatic items, free text for manual ones. */
export function statDisplay(it: StatItem, placeholder = '–'): string {
  if (it.source === 'manual') return it.value || placeholder
  return it.resolvedValue || placeholder
}

export default function StatsBand({ model }: { model: RenderModel }) {
  const { stats } = model.content
  const t = BAND[stats.band]
  const n = stats.items.length
  return (
    <section id={SECTION_ANCHORS.stats} aria-label="Statistik" className={cn(t.bg, 'scroll-mt-20')}>
      <div className={cn(CONTAINER, 'py-8 lg:py-12 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-12')}>
        {stats.intro.trim() && (
          <p className={cn('hidden lg:block m-0 w-[260px] shrink-0 text-[18px] font-semibold leading-[1.4]', t.intro)}>{stats.intro}</p>
        )}
        <dl
          className={cn('flex-1 grid gap-2 lg:gap-6 m-0 text-center lg:text-left', n >= 4 ? 'grid-cols-2 sm:grid-cols-4' : n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : 'grid-cols-3')}
        >
          {stats.items.map(it => (
            <div key={it.id} className={cn('flex flex-col-reverse lg:pl-6 lg:border-l', t.divider)}>
              <dt className={cn('text-xs lg:text-[15px] mt-1', t.label)}>{it.label}</dt>
              <dd className={cn('m-0 text-[22px] lg:text-[36px] xl:text-[44px] font-extrabold tracking-[-0.02em] leading-tight', t.value)}>{statDisplay(it)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
