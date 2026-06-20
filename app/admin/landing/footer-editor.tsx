'use client'

import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
export type FooterLink = { label: string; href: string; group?: string }
export type SocialEntry = {
  icon: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'facebook' | 'linkedin'
  href: string
  label?: string
}
export type AppLinkEntry = { store: 'google_play' | 'app_store'; href: string }
export type FooterMeta = {
  links:     FooterLink[]
  social:    SocialEntry[]
  app_links: AppLinkEntry[]
}

const SOCIAL_ICONS: SocialEntry['icon'][] = [
  'instagram', 'tiktok', 'twitter', 'youtube', 'facebook', 'linkedin',
]

const SOCIAL_LABELS: Record<SocialEntry['icon'], string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  twitter:   'X / Twitter',
  youtube:   'YouTube',
  facebook:  'Facebook',
  linkedin:  'LinkedIn',
}

// ─── Sub-input ────────────────────────────────────────────────────────────────
function InlineInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
      style={{ minHeight: 40, fontSize: 14 }}
    />
  )
}

// ─── Links Tab ────────────────────────────────────────────────────────────────
function LinksTab({
  links, onChange,
}: {
  links: FooterLink[]
  onChange: (links: FooterLink[]) => void
}) {
  function add() {
    onChange([...links, { label: '', href: '', group: 'Produk' }])
  }
  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i))
  }
  function update(i: number, key: keyof FooterLink, value: string) {
    onChange(links.map((l, idx) => idx === i ? { ...l, [key]: value } : l))
  }
  function move(i: number, dir: -1 | 1) {
    const arr = [...links]
    const target = i + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[i], arr[target]] = [arr[target], arr[i]]
    onChange(arr)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#9CA3AF]">Atur link dan grup kolom yang tampil di footer. Grup yang sama akan dikelompokkan dalam satu kolom.</p>

      {links.length === 0 && (
        <div className="text-center py-6 text-sm text-[#9CA3AF] border border-dashed border-[#E5E7EB] rounded-xl">
          Belum ada link. Klik &quot;Tambah Link&quot; untuk mulai.
        </div>
      )}

      <div className="space-y-2">
        {links.map((link, i) => (
          <div
            key={i}
            className="grid gap-2 p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]"
            style={{ gridTemplateColumns: '1fr 1fr 120px auto' }}
          >
            <InlineInput
              value={link.label}
              onChange={v => update(i, 'label', v)}
              placeholder="Label (mis. Fitur)"
            />
            <InlineInput
              value={link.href}
              onChange={v => update(i, 'href', v)}
              placeholder="URL (mis. /#features)"
            />
            <InlineInput
              value={link.group ?? ''}
              onChange={v => update(i, 'group', v)}
              placeholder="Grup Kolom"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Pindah ke atas"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === links.length - 1}
                aria-label="Pindah ke bawah"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Hapus link"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border-2 border-dashed border-[#D1FAE5] text-[#059669] hover:bg-[#F0FDF4] hover:border-[#6EE7B7] transition-colors font-semibold w-full justify-center"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah Link
      </button>
    </div>
  )
}

// ─── Social Tab ───────────────────────────────────────────────────────────────
function SocialTab({
  social, onChange,
}: {
  social: SocialEntry[]
  onChange: (social: SocialEntry[]) => void
}) {
  function add() {
    onChange([...social, { icon: 'instagram', href: '', label: '' }])
  }
  function remove(i: number) {
    onChange(social.filter((_, idx) => idx !== i))
  }
  function update(i: number, key: keyof SocialEntry, value: string) {
    onChange(social.map((s, idx) => idx === i ? { ...s, [key]: value } : s))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#9CA3AF]">Ikon sosial media yang tampil di footer (bawah tagline).</p>

      {social.length === 0 && (
        <div className="text-center py-6 text-sm text-[#9CA3AF] border border-dashed border-[#E5E7EB] rounded-xl">
          Belum ada akun sosial.
        </div>
      )}

      <div className="space-y-2">
        {social.map((s, i) => (
          <div
            key={i}
            className="grid gap-2 p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] items-center"
            style={{ gridTemplateColumns: '140px 1fr 1fr auto' }}
          >
            <select
              value={s.icon}
              onChange={e => update(i, 'icon', e.target.value)}
              className="border border-[#E5E7EB] rounded-lg px-2 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] bg-white"
              style={{ minHeight: 40 }}
            >
              {SOCIAL_ICONS.map(ic => (
                <option key={ic} value={ic}>{SOCIAL_LABELS[ic]}</option>
              ))}
            </select>
            <InlineInput
              value={s.href}
              onChange={v => update(i, 'href', v)}
              placeholder="URL profil"
              type="url"
            />
            <InlineInput
              value={s.label ?? ''}
              onChange={v => update(i, 'label', v)}
              placeholder="Aria label (aksesibilitas)"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Hapus sosial"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border-2 border-dashed border-[#D1FAE5] text-[#059669] hover:bg-[#F0FDF4] hover:border-[#6EE7B7] transition-colors font-semibold w-full justify-center"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah Sosial
      </button>
    </div>
  )
}

// ─── App Links Tab ────────────────────────────────────────────────────────────
function AppLinksTab({
  appLinks, onChange,
}: {
  appLinks: AppLinkEntry[]
  onChange: (appLinks: AppLinkEntry[]) => void
}) {
  const hasPlay  = appLinks.some(a => a.store === 'google_play')
  const hasApple = appLinks.some(a => a.store === 'app_store')

  function toggle(store: AppLinkEntry['store']) {
    if (appLinks.some(a => a.store === store)) {
      onChange(appLinks.filter(a => a.store !== store))
    } else {
      onChange([...appLinks, { store, href: '' }])
    }
  }
  function updateHref(store: AppLinkEntry['store'], href: string) {
    onChange(appLinks.map(a => a.store === store ? { ...a, href } : a))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#9CA3AF]">Tombol download yang tampil di bawah tagline (opsional).</p>

      {/* Google Play */}
      <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasPlay}
            onChange={() => toggle('google_play')}
            className="w-4 h-4 accent-[#2ECC71] cursor-pointer"
          />
          <span className="text-sm font-semibold text-[#374151]">Google Play</span>
        </label>
        {hasPlay && (
          <InlineInput
            value={appLinks.find(a => a.store === 'google_play')?.href ?? ''}
            onChange={v => updateHref('google_play', v)}
            placeholder="https://play.google.com/store/apps/details?id=..."
            type="url"
          />
        )}
      </div>

      {/* App Store */}
      <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasApple}
            onChange={() => toggle('app_store')}
            className="w-4 h-4 accent-[#2ECC71] cursor-pointer"
          />
          <span className="text-sm font-semibold text-[#374151]">App Store (iOS)</span>
        </label>
        {hasApple && (
          <InlineInput
            value={appLinks.find(a => a.store === 'app_store')?.href ?? ''}
            onChange={v => updateHref('app_store', v)}
            placeholder="https://apps.apple.com/app/id..."
            type="url"
          />
        )}
      </div>
    </div>
  )
}

// ─── Footer Meta Preview ──────────────────────────────────────────────────────
function FooterPreview({ value }: { value: FooterMeta }) {
  const groups = value.links.reduce<Record<string, FooterLink[]>>((acc, l) => {
    const g = l.group ?? 'Lainnya'
    if (!acc[g]) acc[g] = []
    acc[g].push(l)
    return acc
  }, {})

  return (
    <div
      className="rounded-xl p-4 overflow-hidden"
      style={{ background: '#0F1A14', minHeight: 120 }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Preview Footer</p>
      <div className="flex gap-6 flex-wrap">
        {/* Brand */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ background: '#2ECC71' }} />
            <span className="text-white text-xs font-bold">Gizku</span>
          </div>
          {value.social.length > 0 && (
            <div className="flex gap-1.5">
              {value.social.slice(0, 4).map((s, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  title={s.icon}
                />
              ))}
            </div>
          )}
        </div>
        {/* Link groups */}
        {Object.entries(groups).slice(0, 3).map(([g, ls]) => (
          <div key={g} className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>{g}</p>
            {ls.slice(0, 4).map(l => (
              <p key={l.href} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{l.label || '—'}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function FooterMetaEditor({
  value,
  onChange,
}: {
  value: FooterMeta
  onChange: (v: FooterMeta) => void
}) {
  const [tab, setTab] = useState<'links' | 'social' | 'app_links'>('links')

  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: 'links',     label: '🔗 Link',      count: value.links.length },
    { key: 'social',    label: '📱 Sosial',    count: value.social.length },
    { key: 'app_links', label: '📲 App Store', count: value.app_links.length },
  ]

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: '#CCFBF1' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#374151]">Konfigurasi Footer</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="flex-1 text-xs py-2 px-3 rounded-lg font-semibold transition-all"
            style={{
              background: tab === t.key ? '#fff' : 'transparent',
              color:      tab === t.key ? '#111827' : '#6B7280',
              boxShadow:  tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                style={{ background: '#2ECC71', color: '#fff' }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: 160 }}>
        {tab === 'links'     && <LinksTab    links={value.links}         onChange={links     => onChange({ ...value, links })} />}
        {tab === 'social'    && <SocialTab   social={value.social}       onChange={social    => onChange({ ...value, social })} />}
        {tab === 'app_links' && <AppLinksTab appLinks={value.app_links}  onChange={app_links => onChange({ ...value, app_links })} />}
      </div>

      {/* Preview */}
      <FooterPreview value={value} />
    </div>
  )
}
