'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FooterLink = {
  label: string
  href: string
  group: string
}

export type SocialLink = {
  icon: string
  href: string
  label: string
}

export type AppLink = {
  store: 'google_play' | 'app_store'
  href: string
}

export type FooterMeta = {
  links: FooterLink[]
  social: SocialLink[]
  app_links: AppLink[]
}

const SOCIAL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter',   label: 'X / Twitter' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'github',    label: 'GitHub' },
]

const STORE_OPTIONS = [
  { value: 'google_play', label: 'Google Play' },
  { value: 'app_store',   label: 'App Store' },
]

const LINK_GROUPS_SUGGESTIONS = ['Produk', 'Perusahaan', 'Legal', 'Dukungan']

// ─── FieldLabel ───────────────────────────────────────────────────────────────

function FL({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-semibold text-[#374151] mb-1.5">
      {children}
      {hint && <span className="font-normal text-[#9CA3AF] ml-1">— {hint}</span>}
    </label>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FooterMetaEditor({
  value,
  onChange,
}: {
  value: FooterMeta
  onChange: (v: FooterMeta) => void
}) {
  const [tab, setTab] = useState<'links' | 'social' | 'apps'>('links')

  // ── Links ──────────────────────────────────────────────────────────────────

  function updateLink(i: number, field: keyof FooterLink, val: string) {
    const next = [...value.links]
    next[i] = { ...next[i], [field]: val }
    onChange({ ...value, links: next })
  }

  function addLink() {
    onChange({
      ...value,
      links: [...value.links, { label: '', href: '/', group: 'Produk' }],
    })
  }

  function removeLink(i: number) {
    onChange({ ...value, links: value.links.filter((_, idx) => idx !== i) })
  }

  function moveLink(i: number, dir: -1 | 1) {
    const next = [...value.links]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange({ ...value, links: next })
  }

  // ── Social ─────────────────────────────────────────────────────────────────

  function updateSocial(i: number, field: keyof SocialLink, val: string) {
    const next = [...value.social]
    next[i] = { ...next[i], [field]: val }
    onChange({ ...value, social: next })
  }

  function addSocial() {
    onChange({
      ...value,
      social: [...value.social, { icon: 'instagram', href: 'https://', label: '' }],
    })
  }

  function removeSocial(i: number) {
    onChange({ ...value, social: value.social.filter((_, idx) => idx !== i) })
  }

  // ── App Links ──────────────────────────────────────────────────────────────

  function updateAppLink(i: number, field: keyof AppLink, val: string) {
    const next = [...value.app_links]
    next[i] = { ...next[i], [field]: val } as AppLink
    onChange({ ...value, app_links: next })
  }

  function addAppLink() {
    const used = new Set(value.app_links.map((a) => a.store))
    const store = (['google_play', 'app_store'] as const).find((s) => !used.has(s))
    if (!store) return
    onChange({
      ...value,
      app_links: [...value.app_links, { store, href: 'https://' }],
    })
  }

  function removeAppLink(i: number) {
    onChange({ ...value, app_links: value.app_links.filter((_, idx) => idx !== i) })
  }

  // ── Live Preview ───────────────────────────────────────────────────────────

  const groupNames = [...new Set(value.links.map((l) => l.group).filter(Boolean))]
  const linksByGroup = groupNames.reduce<Record<string, FooterLink[]>>((acc, g) => {
    acc[g] = value.links.filter((l) => l.group === g)
    return acc
  }, {})

  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5F5EC]">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#F0FDF4' }}>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: '#D1FAE5' }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className="text-xs font-bold text-[#065F46]">Konfigurasi Footer</span>
        <span className="ml-auto text-[10px] text-[#6EE7B7] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
          Footer
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB]" style={{ background: '#FAFFFE' }}>
        {(['links', 'social', 'apps'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors"
            style={{
              color: tab === t ? '#059669' : '#6B7280',
              borderBottom: tab === t ? '2px solid #10B981' : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {t === 'links'  && `🔗 Link (${value.links.length})`}
            {t === 'social' && `📱 Sosial (${value.social.length})`}
            {t === 'apps'   && `📲 App Store (${value.app_links.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3" style={{ background: '#FAFFFE' }}>

        {/* ── Tab: Links ── */}
        {tab === 'links' && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#6B7280] mb-3">
              Tambahkan link navigasi dan kelompokkan ke dalam kolom footer berdasarkan Group.
            </p>

            {/* Quick-add by group */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[10px] text-[#9CA3AF] mr-1 self-center">Grup saran:</span>
              {LINK_GROUPS_SUGGESTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    onChange({ ...value, links: [...value.links, { label: '', href: '/', group: g }] })
                  }
                  className="text-[10px] px-2 py-1 rounded-full border border-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5] transition-colors font-medium"
                >
                  + {g}
                </button>
              ))}
            </div>

            {value.links.length === 0 && (
              <div className="py-6 text-center text-[#9CA3AF] text-xs">
                Belum ada link. Klik tombol di bawah untuk menambahkan.
              </div>
            )}

            {value.links.map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#E5E7EB] bg-white"
              >
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveLink(i, -1)}
                    disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#9CA3AF] hover:text-[#374151] disabled:opacity-25"
                    aria-label="Naikan"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLink(i, 1)}
                    disabled={i === value.links.length - 1}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#9CA3AF] hover:text-[#374151] disabled:opacity-25"
                    aria-label="Turunkan"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

                {/* Group */}
                <input
                  type="text"
                  value={link.group}
                  onChange={(e) => updateLink(i, 'group', e.target.value)}
                  placeholder="Grup"
                  list={`footer-groups-${i}`}
                  className="w-[90px] shrink-0 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                />
                <datalist id={`footer-groups-${i}`}>
                  {LINK_GROUPS_SUGGESTIONS.map((g) => <option key={g} value={g} />)}
                </datalist>

                {/* Label */}
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateLink(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                />

                {/* Href */}
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => updateLink(i, 'href', e.target.value)}
                  placeholder="/path atau https://"
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs font-mono text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                />

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Hapus link"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addLink}
              className="w-full py-2.5 text-xs font-semibold rounded-xl border-2 border-dashed border-[#D1FAE5] text-[#059669] hover:bg-[#F0FDF4] transition-colors"
            >
              + Tambah Link
            </button>
          </div>
        )}

        {/* ── Tab: Social ── */}
        {tab === 'social' && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#6B7280] mb-3">Ikon media sosial yang tampil di footer.</p>

            {value.social.length === 0 && (
              <div className="py-6 text-center text-[#9CA3AF] text-xs">Belum ada akun sosial.</div>
            )}

            {value.social.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#E5E7EB] bg-white"
              >
                <select
                  value={s.icon}
                  onChange={(e) => updateSocial(i, 'icon', e.target.value)}
                  className="w-[120px] shrink-0 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                >
                  {SOCIAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <input
                  type="url"
                  value={s.href}
                  onChange={(e) => updateSocial(i, 'href', e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs font-mono text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                />

                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateSocial(i, 'label', e.target.value)}
                  placeholder="Aria label"
                  className="w-[110px] shrink-0 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                />

                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Hapus"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}

            {value.social.length < SOCIAL_OPTIONS.length && (
              <button
                type="button"
                onClick={addSocial}
                className="w-full py-2.5 text-xs font-semibold rounded-xl border-2 border-dashed border-[#D1FAE5] text-[#059669] hover:bg-[#F0FDF4] transition-colors"
              >
                + Tambah Akun Sosial
              </button>
            )}
          </div>
        )}

        {/* ── Tab: App Links ── */}
        {tab === 'apps' && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#6B7280] mb-3">Tombol download app di kolom brand footer.</p>

            {value.app_links.length === 0 && (
              <div className="py-6 text-center text-[#9CA3AF] text-xs">Belum ada link app store.</div>
            )}

            {value.app_links.map((al, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#E5E7EB] bg-white"
              >
                <select
                  value={al.store}
                  onChange={(e) => updateAppLink(i, 'store', e.target.value)}
                  className="w-[130px] shrink-0 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                >
                  {STORE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <input
                  type="url"
                  value={al.href}
                  onChange={(e) => updateAppLink(i, 'href', e.target.value)}
                  placeholder="https://play.google.com/..."
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-2 text-xs font-mono text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] min-h-[36px]"
                  style={{ fontSize: '14px' }}
                />

                <button
                  type="button"
                  onClick={() => removeAppLink(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Hapus"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}

            {value.app_links.length < 2 && (
              <button
                type="button"
                onClick={addAppLink}
                className="w-full py-2.5 text-xs font-semibold rounded-xl border-2 border-dashed border-[#D1FAE5] text-[#059669] hover:bg-[#F0FDF4] transition-colors"
              >
                + Tambah App Store Link
              </button>
            )}
          </div>
        )}

        {/* ── Live Preview (mini dark) ── */}
        <div className="rounded-xl border border-[#E5E7EB] overflow-hidden mt-4">
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#F9FAFB' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Preview Footer</span>
          </div>
          <div className="p-4" style={{ background: '#0F1A14' }}>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: groupNames.length > 0
                  ? `2fr repeat(${Math.min(groupNames.length, 3)}, 1fr)`
                  : '1fr',
              }}
            >
              {/* Brand mini */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: '#2ECC71' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-white">Gizku</span>
                </div>
                {value.social.length > 0 && (
                  <div className="flex gap-1">
                    {value.social.map((s) => (
                      <div
                        key={s.href}
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                        title={s.icon}
                      >
                        <span className="text-[8px] font-bold uppercase">{s.icon[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
                {value.app_links.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {value.app_links.map((al) => (
                      <div
                        key={al.store}
                        className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {al.store === 'google_play' ? 'GP' : 'AS'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link columns mini */}
              {groupNames.slice(0, 3).map((g) => (
                <div key={g}>
                  <p
                    className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {g}
                  </p>
                  {linksByGroup[g]?.slice(0, 4).map((l) => (
                    <p key={l.href} className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {l.label || '—'}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
