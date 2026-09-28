'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowDown, ArrowUp, ChevronRight, Lock, Settings2 } from 'lucide-react'
import { Switch, TrackedLink } from '@/components/admin/ui'
import { sectionHasContent } from '@/lib/landing/render'
import {
  SECTION_LABELS, SECTION_SLUGS, type BuilderSection, type LandingContent, type SectionKey,
} from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { useBuilder, useDraft } from './BuilderContext'
import SortableList, { DragHandle } from './SortableList'

export function sectionSummary(k: BuilderSection, c: LandingContent): string {
  switch (k) {
    case 'header': return `${c.header.nav.filter(n => n.active).length} menu · tombol kanan`
    case 'hero': return c.hero.showStoreBadges ? 'Judul, tombol, badge' : 'Judul, tombol'
    case 'stats': {
      const auto = c.stats.items.filter(i => i.source === 'auto').length
      return `${c.stats.items.length} angka${auto ? ` · ${auto} otomatis` : ''}`
    }
    case 'howItWorks': return `${c.howItWorks.items.length} langkah`
    case 'features': {
      const n = c.features.rows.reduce((s, r) => s + r.items.length, 0)
      return `${n} fitur · ${c.features.rows.filter(r => r.items.length).length} baris`
    }
    case 'testimonials': {
      const live = c.testimonials.items.filter(t => t.status === 'live' && t.consentAt).length
      return `${c.testimonials.items.length} testimoni · ${live} aktif`
    }
    case 'faq': return `${c.faq.items.length} pertanyaan · ${c.faq.items.filter(i => i.status === 'live').length} tayang`
    case 'cta': return c.cta.showBadges ? 'Tombol + badge download' : 'Tombol'
    case 'footer': return `${c.footer.groups.length} grup link · sosial`
  }
}

export function sectionHref(k: BuilderSection) {
  return `/admin/landing/${SECTION_SLUGS[k]}`
}

function useActiveSection(): BuilderSection | 'settings' | null {
  const path = usePathname() ?? ''
  const slug = path.split('/')[3]
  if (!slug) return null
  if (slug === 'settings') return 'settings'
  const hit = (Object.entries(SECTION_SLUGS) as [BuilderSection, string][]).find(([, s]) => s === slug)
  return hit ? hit[0] : null
}

function Meta({ k, hidden }: { k: BuilderSection; hidden?: boolean }) {
  const { changes } = useBuilder()
  const c = useDraft()
  const n = changes[k] ?? 0
  if (hidden) {
    const empty = k !== 'header' && k !== 'footer' && !sectionHasContent(c, k as SectionKey)
    return <span className="text-sm text-secondary">Disembunyikan{empty ? ' · belum ada isi' : ''}</span>
  }
  if (n > 0) return <span className="text-sm font-semibold text-honey-500">{n} perubahan</span>
  return <span className="text-sm text-secondary">{sectionSummary(k, c)}</span>
}

function LockedRow({ k, active, mobile }: { k: 'header' | 'footer'; active: boolean; mobile?: boolean }) {
  const { changes } = useBuilder()
  const n = changes[k] ?? 0
  return (
    <TrackedLink
      href={sectionHref(k)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-md border pl-1 pr-3 min-h-[60px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
        active ? 'border-green-600 border-[1.5px] bg-green-50' : 'border-transparent hover:bg-muted',
        mobile && 'bg-surface shadow-card border-transparent min-h-[64px] pl-3',
      )}
    >
      <span className="w-7 h-9 max-lg:w-auto inline-flex items-center justify-center shrink-0" title="Terkunci — tidak bisa diurutkan atau disembunyikan">
        <Lock size={15} aria-hidden className="text-secondary" />
      </span>
      <span className="flex-1 min-w-0 py-2">
        <span className={cn('block text-md font-semibold truncate', active ? 'text-green-800' : 'text-primary')}>{SECTION_LABELS[k]}</span>
        <span className={cn('block text-sm truncate', n > 0 ? 'font-semibold text-honey-500' : 'text-secondary')}>
          {n > 0 ? `${n} perubahan` : k === 'header' ? 'Global · terkunci di atas' : 'Terkunci di bawah'}
        </span>
      </span>
      {mobile && <ChevronRight size={18} aria-hidden className="text-secondary" />}
    </TrackedLink>
  )
}

function SectionRow({ k, active, handle, mobile, reorder }: {
  k: SectionKey
  active: boolean
  handle?: React.ReactNode
  mobile?: boolean
  reorder?: React.ReactNode
}) {
  const { update } = useBuilder()
  const c = useDraft()
  const visible = c.visibility[k]
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-md border pl-1 pr-3 min-h-[60px] transition-colors',
      active ? 'border-green-600 border-[1.5px] bg-green-50' : 'border-transparent hover:bg-muted',
      mobile && 'bg-surface shadow-card border-transparent min-h-[64px] pl-3',
    )}>
      {handle}
      <TrackedLink
        href={sectionHref(k)}
        aria-current={active ? 'page' : undefined}
        className="flex-1 min-w-0 py-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <span className={cn('block text-md font-semibold truncate', active ? 'text-green-800' : visible ? 'text-primary' : 'text-secondary')}>{SECTION_LABELS[k]}</span>
        <span className="block truncate"><Meta k={k} hidden={!visible} /></span>
      </TrackedLink>
      {reorder}
      <Switch
        checked={visible}
        onChange={v => update('visibility', { ...c.visibility, [k]: v })}
        className="shrink-0"
        ariaLabel={`Tampilkan section ${SECTION_LABELS[k]}`}
      />
      {mobile && (
        <TrackedLink href={sectionHref(k)} aria-label={`Edit ${SECTION_LABELS[k]}`} className="w-8 h-11 -mr-1 inline-flex items-center justify-center text-secondary">
          <ChevronRight size={18} aria-hidden />
        </TrackedLink>
      )}
    </div>
  )
}

export function GlobalSettingsCard({ active }: { active?: boolean }) {
  return (
    <TrackedLink
      href="/admin/landing/settings"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
        active ? 'bg-green-50 border-[1.5px] border-green-600' : 'bg-sunken hover:bg-muted',
      )}
    >
      <Settings2 size={20} aria-hidden className="text-secondary shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-primary">Pengaturan global →</span>
        <span className="block text-sm text-secondary">Tujuan tombol, tautan download, SEO</span>
      </span>
    </TrackedLink>
  )
}

/** Desktop "Susunan Halaman" column: drag to reorder the 7 middle sections. */
export function SectionListDesktop() {
  const { update } = useBuilder()
  const c = useDraft()
  const active = useActiveSection()
  return (
    <nav aria-label="Susunan halaman" className="flex flex-col gap-1">
      <LockedRow k="header" active={active === 'header'} />
      <SortableList
        items={c.order}
        getId={k => k}
        onReorder={next => update('order', next)}
        className="flex flex-col gap-1"
        renderItem={(k, handle) => (
          <SectionRow k={k} active={active === k} handle={<DragHandle label={`Urutkan ${SECTION_LABELS[k]}`} {...handle} />} />
        )}
      />
      <LockedRow k="footer" active={active === 'footer'} />
    </nav>
  )
}

/** Mobile list: full-width cards; drag replaced by an "Urutkan" up/down mode. */
export function SectionListMobile() {
  const { update } = useBuilder()
  const c = useDraft()
  const [sorting, setSorting] = useState(false)
  const move = (i: number, d: -1 | 1) => {
    const next = [...c.order]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    update('order', next)
  }
  return (
    <nav aria-label="Susunan halaman" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-primary">Susunan Halaman</h2>
        <button
          type="button"
          onClick={() => setSorting(s => !s)}
          aria-pressed={sorting}
          className={cn('min-h-11 px-3 rounded-sm text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500', sorting ? 'bg-brand text-white' : 'text-green-700 hover:bg-green-50')}
        >
          {sorting ? 'Selesai' : 'Urutkan'}
        </button>
      </div>
      <LockedRow k="header" active={false} mobile />
      <ul className="m-0 p-0 flex flex-col gap-2.5 list-none">
        {c.order.map((k, i) => (
          <li key={k}>
            <SectionRow
              k={k}
              active={false}
              mobile
              reorder={sorting ? (
                <span className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Naikkan ${SECTION_LABELS[k]}`} className="w-11 h-11 inline-flex items-center justify-center rounded-sm border border-border-strong disabled:opacity-40"><ArrowUp size={18} aria-hidden /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === c.order.length - 1} aria-label={`Turunkan ${SECTION_LABELS[k]}`} className="w-11 h-11 inline-flex items-center justify-center rounded-sm border border-border-strong disabled:opacity-40"><ArrowDown size={18} aria-hidden /></button>
                </span>
              ) : undefined}
            />
          </li>
        ))}
      </ul>
      <LockedRow k="footer" active={false} mobile />
      <div className="mt-1"><GlobalSettingsCard /></div>
    </nav>
  )
}

export { useActiveSection }
