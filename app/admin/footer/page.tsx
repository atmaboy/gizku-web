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

type FormState = {
  id: number | null
  slug: string
  title: string
  subtitle: string
  body: string
  isActive: boolean
  sortOrder: number
  // meta fields
  meta_type: string         // 'brand' | 'links_group' | 'social' | 'tagline' | 'copyright'
  meta_links: { label: string; url: string }[]
  meta_icon: string
}

const EMPTY_FORM: FormState = {
  id: null, slug: '', title: '', subtitle: '', body: '',
  isActive: true, sortOrder: 0,
  meta_type: 'tagline',
  meta_links: [],
  meta_icon: '',
}

/* ─── Slug presets ──────────────────────────────────────── */
const SLUG_PRESETS = [
  { value: 'footer-brand',     label: 'Brand / Logo' },
  { value: 'footer-tagline',   label: 'Tagline' },
  { value: 'footer-copyright', label: 'Copyright' },
  { value: 'footer-links-product',  label: 'Link Grup: Produk' },
  { value: 'footer-links-company',  label: 'Link Grup: Perusahaan' },
  { value: 'footer-links-legal',    label: 'Link Grup: Legal' },
  { value: 'footer-social',    label: 'Social Media' },
  { value: 'footer-custom',    label: 'Custom' },
]

const META_TYPES = [
  { value: 'tagline',     label: 'Teks / Tagline' },
  { value: 'copyright',   label: 'Copyright' },
  { value: 'links_group', label: 'Grup Link' },
  { value: 'social',      label: 'Social Media' },
  { value: 'brand',       label: 'Brand / Logo' },
]

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
    meta_links: (meta.links as { label: string; url: string }[]) ?? [],
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

/* ─── Component ─────────────────────────────────────────── */
export default function FooterConfigPage() {
  const [rows, setRows]         = useState<FooterRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [preview, setPreview]   = useState(false)

  /* ── Fetch rows ─────────────────────────────────── */
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

  /* ── Save ───────────────────────────────────────── */
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

  /* ── Toggle active ──────────────────────────────── */
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

  /* ── Delete ─────────────────────────────────────── */
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

  /* ── Edit ───────────────────────────────────────── */
  function edit(r: FooterRow) {
    setForm(rowToForm(r))
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── Links editor helper ────────────────────────── */
  function setLink(i: number, field: 'label' | 'url', val: string) {
    setForm(f => {
      const links = [...f.meta_links]
      links[i] = { ...links[i], [field]: val }
      return { ...f, meta_links: links }
    })
  }
  function addLink()    { setForm(f => ({ ...f, meta_links: [...f.meta_links, { label: '', url: '' }] })) }
  function removeLink(i: number) { setForm(f => ({ ...f, meta_links: f.meta_links.filter((_, j) => j !== i) })) }

  /* ── Preview: build footer HTML from rows ───────── */
  const previewRows = rows.filter(r => r.isActive)
  const brandRow    = previewRows.find(r => r.meta?.type === 'brand' || r.slug === 'footer-brand')
  const taglineRow  = previewRows.find(r => r.meta?.type === 'tagline' || r.slug === 'footer-tagline')
  const copyRow     = previewRows.find(r => r.meta?.type === 'copyright' || r.slug === 'footer-copyright')
  const linkGroups  = previewRows.filter(r => r.meta?.type === 'links_group')
  const socialRow   = previewRows.find(r => r.meta?.type === 'social')

  /* ─────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
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
              