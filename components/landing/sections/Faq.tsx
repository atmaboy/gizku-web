'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { sanitizeFaqHtml } from '@/lib/landing/sanitize'
import { SECTION_ANCHORS, type Faq as FaqData, type Settings } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import CmsLink from './CmsLink'
import { ArrowRight } from './icons'
import { CONTAINER, EYEBROW, H2, LEAD } from './shared'

function Item({ question, answerHtml, defaultOpen }: { question: string; answerHtml: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={cn(
      'rounded-[14px] lg:rounded-2xl bg-surface transition-shadow',
      open ? 'border-[1.5px] border-green-300 shadow-[0_4px_16px_rgba(36,30,25,0.08)]' : 'shadow-hairline border-[1.5px] border-transparent',
    )}>
      <h3 className="m-0">
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-full min-h-11 p-[18px] lg:px-6 lg:py-[22px] flex items-center justify-between gap-3 lg:gap-4 bg-transparent border-0 text-left cursor-pointer rounded-[14px] lg:rounded-2xl',
            'text-[15px] lg:text-[17px] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
            open ? 'font-bold' : 'font-semibold',
          )}
        >
          {question}
          <span className={cn(
            'w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform',
            open ? 'bg-green-600 text-white rotate-180' : 'bg-green-50 text-green-700',
          )}>
            <ChevronDown size={18} strokeWidth={2.2} aria-hidden />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
        hidden={!open}
        className="faq-answer px-[18px] pb-[18px] lg:px-6 lg:pb-6 text-[15px] lg:text-[16px] leading-[1.6] text-clay-600"
        dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(answerHtml) }}
      />
    </div>
  )
}

export default function Faq({ data, settings }: { data: FaqData; settings: Pick<Settings, 'ctaUrlGuest' | 'ctaUrlAuth'> }) {
  const items = data.items.filter(i => i.status === 'live')
  const hasContact = !!data.contact.label.trim()
  return (
    <section id={SECTION_ANCHORS.faq} aria-labelledby="faq-title" className="bg-page scroll-mt-20">
      <div className={cn(CONTAINER, 'py-16 lg:py-28 flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-20')}>
        <div className="lg:w-[400px] shrink-0 flex flex-col items-start">
          {data.eyebrow.trim() && <span className={EYEBROW}>{data.eyebrow}</span>}
          <h2 id="faq-title" className={cn(H2, 'mt-2.5 lg:mt-3')}>{data.title}</h2>
          {data.subtitle.trim() && <p className={cn(LEAD, 'hidden lg:block mt-4')}>{data.subtitle}</p>}
          {hasContact && (
            <CmsLink
              link={data.contact}
              settings={settings}
              className="hidden lg:inline-flex mt-6 h-12 px-[22px] items-center gap-2 rounded-pill border-[1.5px] border-green-600 text-green-700 text-[15px] font-semibold no-underline hover:bg-green-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {data.contact.label}
              <ArrowRight size={16} />
            </CmsLink>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2.5 lg:gap-3">
          {items.map(it => <Item key={it.id} question={it.question} answerHtml={it.answerHtml} defaultOpen={it.openDefault} />)}
        </div>
        {(hasContact || data.subtitle.trim()) && (
          <p className="lg:hidden m-0 text-[15px] text-clay-600">
            {data.subtitle}{' '}
            {hasContact && <CmsLink link={data.contact} settings={settings} className="font-semibold text-green-700 underline-offset-2 hover:underline" />}
          </p>
        )}
      </div>
    </section>
  )
}
