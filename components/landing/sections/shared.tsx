import { cn } from '@/lib/utils'

/** 1200px content column (120px side padding at 1440), 20px gutters on mobile. */
export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-5 md:px-10'

export const EYEBROW = 'text-xs lg:text-[13px] font-bold uppercase tracking-[0.08em] text-green-700'
export const H2 = 'font-extrabold tracking-[-0.02em] text-primary text-[28px] leading-[1.2] lg:text-[40px] lg:leading-[1.15]'
export const LEAD = 'text-[15px] lg:text-[17px] leading-[1.55] text-clay-600'

/** Centered eyebrow + H2 + lead used by most sections. */
export function SectionHeading({ eyebrow, title, subtitle, id, className, align = 'center' }: {
  eyebrow?: string; title: string; subtitle?: string; id?: string; className?: string; align?: 'center' | 'left'
}) {
  return (
    <div className={cn('flex flex-col', align === 'center' ? 'items-center text-center' : 'items-start text-left', className)}>
      {eyebrow?.trim() && <span className={EYEBROW}>{eyebrow}</span>}
      <h2 id={id} className={cn(H2, 'mt-2.5 lg:mt-3')}>{title}</h2>
      {subtitle?.trim() && <p className={cn(LEAD, 'mt-2.5 lg:mt-3.5 max-w-[540px]')}>{subtitle}</p>}
    </div>
  )
}
