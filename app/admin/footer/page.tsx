'use client'

import { useEffect, useState, useCallback } from 'react'

/* ─── Types ─────────────────────────────────────────────── */
type FooterRow = {
  id: number
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
  updatedAt: string
}

type LinkItem = { label: string; url: string }

type FormState = {
  id: number | null
  slug: string
  title: string
  subtitle: string
  body: string
  isActive: boolean
  sortOrder: number
  meta_type: string
  meta_links: LinkItem[]
  meta_icon: string
}

const EMPTY_FORM: FormState = {
  id: null, slug: '', title: '', subtitle: '', body: '',
  isActive: true, sortOrder: 0,
  meta_type: 'tagline',
  meta_links: [],
  meta_icon: '',
}

const SLUG_PRESETS = [
  { value: 'footer-brand',          label: 'Brand / Logo' },
  { value: 'footer-tagline',        label: 'Tagline' },
  { value: 'footer-copyright',      label: 'Copyright' },
  { value: 'footer-links-product',  label: 'Link Grup: Produk' },
  { value: 'footer-links-company',  label: 'Link Grup: Perusahaan' },
  { value: 'footer-links-legal',    label: 'Link Grup: Legal' },
  { value: 'footer-social',         label: 'Social Media' },
  { value: 'footer-custom',         label: 'Custom' },
]

const META_TYPES = [
  { value: 'tagline',     label: 'Teks / Tagline' },
  { value: 'copyright',   label: 'Copyright' },
  { value: 'links_group', label: 'Grup Link' },
  { value: 'social',      label: 'Social Media' },
  { value: 'brand',       label: 'Brand / Logo' },
]

const META_TYPE_COLORS: Record<string, string> = {
  brand:       '#8B5CF6',
  tagline:     '#2ECC71',
  copyright:   '#6B7280',
  links_group: '#3B82F6',
  social:      '#F59E0B',
}

/* ─── Helper ─────────────────────────────────────────────── */
function toast(msg: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;
    color:#fff;background:${type === 'success' ? '#2ECC71' : '#EF4444'};
    box-shadow:0 4px 16px rgba(0,0,0,0.15);transition:opacity 0.4s;
  `
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400) }, 2800)
}

function rowToForm(r: FooterRow): FormState {
  const meta = r.meta ?? {}
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle ?? '',
    body: r.body ?? '',
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    meta_type: (meta.type as string) ?? 'tagline',
    meta_links: (meta.links as LinkItem[]) ?? [],
    meta_icon: (meta.icon as string) ?? '',
  }
}

function formToPayload(f: FormState) {
  const meta: Record<string, unknown> = { type: f.meta_type }
  if (f.meta_type === 'links_group') meta.links = f.meta_links
  if (f.meta_type === 'social')      meta.links = f.meta_links
  if (f.meta_icon)                   meta.icon  = f.meta_icon
  return {
    id:        f.id,
    slug:      f.slug,
    title:     f.title,
    subtitle:  f.subtitle || null,
    body:      f.body || null,
    meta,
    isActive:  f.isActive,
    sortOrder: f.sortOrder,
  }
}

/* ─── Input component ───────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
  background: '#fff', color: '#111827', transition: 'border-color 0.15s',
}

/* ─── Badge ─────────────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const color = META_TYPE_COLORS[type] ?? '#6B7280'
  const label = META_TYPES.find(m => m.value === type)?.label ?? type
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: color + '18', color,
    }}>{label}</span>
  )
}

/* ─── Preview Panel ─────────────────────────────────────── */
function FooterPreview({ rows }: { rows: FooterRow[] }) {
  const active      = rows.filter(r => r.isActive)
  const brand       = active.find(r => r.meta?.type === 'brand')
  const tagline     = active.find(r => r.meta?.type === 'tagline')
  const copyright   = active.find(r => r.meta?.type === 'copyright')
  const linkGroups  = active.filter(r => r.meta?.type === 'links_group')
  const social      = active.find(r => r.meta?.type === 'social')
  const socialLinks = (social?.meta?.links as LinkItem[]) ?? []

  return (
    <div style={{
      background: '#111827', borderRadius: 16, padding: '40px 32px 28px',
      marginBottom: 32, border: '1px solid #1F2937',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>PREVIEW FOOTER</p>

      {/* Top: brand + links */}
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid #1F2937' }}>
        {/* Brand column */}
        <div style={{ flex: '0 0 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#2ECC71', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>G</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{brand?.title ?? 'Gizku'}</span>
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{tagline?.subtitle ?? 'AI Nutrition Companion'}</p>
          {/* Social icons */}
          {socialLinks.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {socialLinks.map((l, i) => (
                <span key={i} style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: '#1F2937', color: '#9CA3AF', fontSize: 11, fontWeight: 600,
                }}>{l.label}</span>
              ))}
            </div>
          )}
        </div>

        {/* Link group columns */}
        {linkGroups.map((g) => {
          const links = (g.meta?.links as LinkItem[]) ?? []
          return (
            <div key={g.id} style={{ flex: '0 0 140px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.title}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map((l, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#6B7280' }}>{l.label}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Copyright */}
      <p style={{ fontSize: 12, color: '#4B5563', textAlign: 'center' }}>
        {copyright?.title ?? `© ${new Date().getFullYear()} Gizku. Dibuat dengan 💚 untuk hidup lebih sehat.`}
      </p>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────── */
export default function FooterConfigPage() {
  const [rows, setRows]         = useState<FooterRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [preview, setPreview]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/footer')
      const j   = await res.json()
      setRows(j.data ?? [])
    } catch {
      toast('Gagal memuat data footer', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.slug || !form.title) {
      toast('Slug dan title wajib diisi', 'error'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/footer?action=upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menyimpan', 'error'); return }
      toast(j.message ?? 'Tersimpan')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch {
      toast('Terjadi kesalahan', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: number, current: boolean) {
    try {
      await fetch('/api/admin/footer?action=toggle_active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !current }),
      })
      load()
    } catch {
      toast('Gagal mengubah status', 'error')
    }
  }

  async function del(id: number) {
    if (!confirm('Hapus item ini?')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/admin/footer', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menghapus', 'error'); return }
      toast(j.message ?? 'Dihapus')
      load()
    } catch {
      toast('Terjadi kesalahan', 'error')
    } finally {
      setDeleting(null)
    }
  }

  function edit(r: FooterRow) {
    setForm(rowToForm(r))
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setLink(i: number, field: 'label' | 'url', val: string) {
    setForm(f => {
      const links = [...f.meta_links]
      links[i] = { ...links[i], [field]: val }
      return { ...f, meta_links: links }
    })
  }
  function addLink()              { setForm(f => ({ ...f, meta_links: [...f.meta_links, { label: '', url: '' }] })) }
  function removeLink(i: number) { setForm(f => ({ ...f, meta_links: f.meta_links.filter((_, j) => j !== i) })) }

  const S: React.CSSProperties = {
    fontFamily: '\'Plus Jakarta Sans\', system-ui, sans-serif',
    maxWidth: 880, margin: '0 auto',
  }

  return (
    <div style={S}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Konfigurasi Footer</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Kelola teks, link, dan konten footer landing page Gizku</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPreview(p => !p)}
            style={{
              padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E5E7EB',
              background: preview ? '#F0FDF4' : '#fff', color: preview ? '#15803D' : '#374151',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {preview ? '✓ Preview Aktif' : '👁 Preview'}
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowForm(s => !s) }}
            style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: '#111827', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {showForm ? '✕ Tutup Form' : '+ Tambah Item'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && <FooterPreview rows={rows} />}

      {/* Form */}
      {showForm && (
        <div style={{
          background: '#F9FAFB', borderRadius: 16, padding: 24,
          border: '1.5px solid #E5E7EB', marginBottom: 28,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>
            {form.id ? '✏️ Edit Item Footer' : '➕ Tambah Item Footer'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            <Field label="Slug" required>
              <select
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Pilih slug —</option>
                {SLUG_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
                ))}
              </select>
            </Field>

            <Field label="Tipe Konten" required>
              <select
                value={form.meta_type}
                onChange={e => setForm(f => ({ ...f, meta_type: e.target.value, meta_links: [] }))}
                style={inputStyle}
              >
                {META_TYPES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Title" required>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={form.meta_type === 'copyright' ? '© 2025 Gizku. Semua hak dilindungi.' : form.meta_type === 'brand' ? 'Gizku' : 'Judul atau nama grup'}
                style={inputStyle}
              />
            </Field>

            <Field label="Subtitle">
              <input
                value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                placeholder="Sub-teks (opsional)"
                style={inputStyle}
              />
            </Field>

            <Field label="Urutan (Sort Order)">
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                style={{ ...inputStyle, width: 100 }}
              />
            </Field>

            <Field label="Status">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#2ECC71' }}
                />
                Aktif
              </label>
            </Field>
          </div>

          {/* Links editor — untuk links_group & social */}
          {(form.meta_type === 'links_group' || form.meta_type === 'social') && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {form.meta_type === 'social' ? 'Social Media Links' : 'Daftar Link'}
              </p>
              {form.meta_links.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <input
                    value={l.label}
                    onChange={e => setLink(i, 'label', e.target.value)}
                    placeholder="Label (misal: Instagram)"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    value={l.url}
                    onChange={e => setLink(i, 'url', e.target.value)}
                    placeholder="URL (misal: https://instagram.com/gizku)"
                    style={{ ...inputStyle, flex: 2 }}
                  />
                  <button
                    onClick={() => removeLink(i)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                  >✕</button>
                </div>
              ))}
              <button
                onClick={addLink}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px dashed #D1FAE5', background: '#F0FDF4', color: '#15803D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >+ Tambah Link</button>
            </div>
          )}

          {/* Body (free text) */}
          <Field label="Body / Keterangan Tambahan">
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={2}
              placeholder="Teks tambahan (opsional)"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >Batal</button>
            <button
              onClick={save}
              disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: saving ? '#9CA3AF' : '#111827', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
            >{saving ? 'Menyimpan…' : form.id ? 'Update' : 'Simpan'}</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: 14 }}>Memuat…</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: '#F9FAFB', borderRadius: 16, border: '1.5px dashed #E5E7EB' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🦶</p>
          <p style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Belum ada item footer</p>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Klik "+ Tambah Item" untuk mulai mengonfigurasi footer.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Slug', 'Title', 'Tipe', 'Urutan', 'Status', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#6B7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F3F4F6' : 'none', background: r.isActive ? '#fff' : '#F9FAFB' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>{r.slug}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td style={{ padding: '12px 16px' }}><TypeBadge type={(r.meta?.type as string) ?? 'unknown'} /></td>
                  <td style={{ padding: '12px 16px', color: '#6B7280', textAlign: 'center' }}>{r.sortOrder}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => toggleActive(r.id, r.isActive)}
                      style={{
                        padding: '3px 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        background: r.isActive ? '#D1FAE5' : '#F3F4F6',
                        color: r.isActive ? '#15803D' : '#9CA3AF',
                      }}
                    >{r.isActive ? 'Aktif' : 'Nonaktif'}</button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => edit(r)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={() => del(r.id)}
                        disabled={deleting === r.id}
                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >{deleting === r.id ? '…' : 'Hapus'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guide */}
      <div style={{ marginTop: 32, padding: 20, background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#15803D', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💡 Panduan Slug Footer</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
          {SLUG_PRESETS.map(p => (
            <div key={p.value} style={{ fontSize: 12, color: '#374151' }}>
              <code style={{ fontSize: 11, color: '#15803D', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4 }}>{p.value}</code> — {p.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
