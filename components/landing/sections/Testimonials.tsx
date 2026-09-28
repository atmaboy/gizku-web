'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { initialOf } from '@/lib/landing/format'
import { SECTION_ANCHORS, type Testimonial, type Testimonials as TestimonialsData } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { StarIcon } from './icons'
import { SectionHeading } from './shared'

const AUTOPLAY_MS = 6000
const AVATAR_TONES = ['bg-green-200 text-green-800', 'bg-green-50 text-green-800', 'bg-sand-100 text-bark-700']

function Card({ t, i, active, showRating }: { t: Testimonial; i: number; active: boolean; showRating: boolean }) {
  return (
    <figure
      className={cn(
        'm-0 w-[310px] lg:w-[380px] shrink-0 snap-start box-border p-6 lg:p-8 rounded-[18px] lg:rounded-[20px] flex flex-col gap-4 lg:gap-5 transition-colors duration-300',
        active ? 'bg-green-600 text-white' : 'bg-page shadow-hairline text-bark-800',
      )}
      aria-roledescription="slide"
      aria-label={`${i + 1}: ${t.name}`}
    >
      {showRating && (
        <div className={cn('flex gap-[3px]', active ? 'text-sand-100' : 'text-honey-500')} role="img" aria-label={`Rating ${t.rating} dari 5`}>
          {[1, 2, 3, 4, 5].map(n => <StarIcon key={n} filled={n <= t.rating} />)}
        </div>
      )}
      <blockquote className="m-0 text-[16px] lg:text-[17px] leading-[1.6]">“{t.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-2.5 lg:gap-3">
        {t.avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={t.avatarUrl} alt="" width={44} height={44} loading="lazy" className="w-10 h-10 lg:w-11 lg:h-11 rounded-full object-cover shrink-0" />
          : <span aria-hidden className={cn('w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center font-bold shrink-0', active ? 'bg-green-50 text-green-800' : AVATAR_TONES[i % AVATAR_TONES.length])}>{initialOf(t.name)}</span>}
        <span className="flex flex-col min-w-0">
          <span className={cn('text-sm lg:text-[15px] font-bold', active ? 'text-white' : 'text-primary')}>{t.name}</span>
          {t.city.trim() && <span className={cn('text-xs lg:text-[13px]', active ? 'text-green-100' : 'text-clay-600')}>{t.city}</span>}
        </span>
      </figcaption>
    </figure>
  )
}

/* ─── Carousel: native horizontal scroll with snap (swipe on touch), prev/next
       buttons + dots, optional 6 s autoplay that pauses on hover/focus and is
       off under prefers-reduced-motion. ── */
export default function Testimonials({ data }: { data: TestimonialsData }) {
  const items = data.items.filter(t => t.status === 'live' && t.consentAt)
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const count = items.length

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const goTo = useCallback((i: number) => {
    const track = trackRef.current
    if (!track || count === 0) return
    const idx = ((i % count) + count) % count
    const card = track.children[idx] as HTMLElement | undefined
    if (!card) return
    // Scroll position 0 = first card at the padded start edge, so the offset
    // between cards is exactly how far to scroll.
    const first = track.children[0] as HTMLElement
    track.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: reduced ? 'auto' : 'smooth' })
    setActive(idx)
  }, [count, reduced])

  // Track which card is nearest the start edge while the user swipes/scrolls.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const first = track.children[0] as HTMLElement | undefined
        if (!first) return
        const step = (track.children[1] as HTMLElement | undefined)?.offsetLeft ?? 0
        const width = step ? step - first.offsetLeft : first.offsetWidth
        const idx = Math.round(track.scrollLeft / Math.max(1, width))
        setActive(Math.min(count - 1, Math.max(0, idx)))
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => { track.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [count])

  useEffect(() => {
    if (!data.autoplay || reduced || paused || count < 2) return
    const t = window.setTimeout(() => goTo(active + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [data.autoplay, reduced, paused, count, active, goTo])

  if (count === 0) return null
  return (
    <section
      id={SECTION_ANCHORS.testimonials}
      aria-labelledby="testimoni-title"
      aria-roledescription="carousel"
      className="bg-surface py-16 lg:py-28 overflow-hidden scroll-mt-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false) }}
    >
      <SectionHeading id="testimoni-title" eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} className="px-5" />
      <div
        ref={trackRef}
        className="no-scrollbar mt-7 lg:mt-14 flex gap-3 lg:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pl-[max(20px,calc((100%-1200px)/2))] pr-[max(20px,calc((100%-1200px)/2))] scroll-pl-[max(20px,calc((100%-1200px)/2))]"
        aria-live={data.autoplay && !paused ? 'off' : 'polite'}
      >
        {items.map((t, i) => <Card key={t.id} t={t} i={i} active={i === active} showRating={data.showRating} />)}
      </div>
      {count > 1 && (
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-10 mt-5 lg:mt-10 flex items-center justify-center lg:justify-between">
          <div className="flex gap-1.5 lg:gap-2">
            {items.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Tampilkan testimoni ${i + 1}`}
                aria-current={i === active}
                className="h-11 flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
              >
                <span className={cn('block h-2 rounded-lg transition-all', i === active ? 'w-6 lg:w-7 bg-green-600' : 'w-2 bg-sand-300')} />
              </button>
            ))}
          </div>
          <div className="hidden lg:flex gap-2.5">
            <button type="button" onClick={() => goTo(active - 1)} aria-label="Testimoni sebelumnya" className="w-12 h-12 rounded-full border-[1.5px] border-sand-300 bg-surface text-primary flex items-center justify-center hover:border-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => goTo(active + 1)} aria-label="Testimoni berikutnya" className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2">
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
