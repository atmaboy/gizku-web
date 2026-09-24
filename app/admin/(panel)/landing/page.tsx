'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast as sonner } from 'sonner'
import {
  BarChart3, CheckCircle2, Clock, ExternalLink, FileText, Home, Image as ImageIcon, LayoutTemplate, MousePointerClick,
  Pencil, Plus, Save, Trash2, Zap, type LucideIcon,
} from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import HeroImageUploader from '@/components/admin/HeroImageUploader'
import {
  Alert, Badge, Button, Card, Code, EmptyState, FormField, Input, Modal, Select, Skeleton, Switch, Textarea,
} from '@/components/admin/ui'
import { cn } from '@/lib/utils'

type ContentRow = {
  id: number
  section: string
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

type EditRow = Partial<ContentRow> & {
  metaRaw: string
  ctaLabel: string
  ctaNote: string
  benefitList: string
  ctaUrlGuest: string
  ctaUrlAuth: string
  heroImageUrl: string
}

// Section colours are Gizku accents; they tint the icon only so labels stay readable.
const SECTION_LABELS: Record<string, { label: string; icon: LucideIcon; iconCls: string; activeBorder: string }> = {
  hero:         { label: 'Hero',       icon: Home,         iconCls: 'text-brand',      activeBorder: 'border-brand' },
  how_it_works: { label: 'Cara Kerja', icon: Clock,        iconCls: 'text-sage-500',   activeBorder: 'border-sage-500' },
  features:     { label: 'Fitur',      icon: Zap,          iconCls: 'text-green-500',  activeBorder: 'border-green-500' },
  stats:        { label: 'Statistik',  icon: BarChart3,    iconCls: 'text-honey-500',  activeBorder: 'border-honey-500' },
  cta:          { label: 'CTA',        icon: CheckCircle2, iconCls: 'text-tomato-500', activeBorder: 'border-tomato-500' },
  blog_post:    { label: 'Blog Post',  icon: FileText,     iconCls: 'text-clay-600',   activeBorder: 'border-clay-600' },
}

const SECTIONS       = Object.keys(SECTION_LABELS)
const CTA_SECTIONS   = ['hero', 'cta']
const HERO_SECTIONS  = ['hero']

// ─────────────────────────────────────────────────────────────────────────────
// Helper: toEditRow
// ─────────────────────────────────────────────────────────────────────────────
function toEditRow(row?: ContentRow): EditRow {
  const meta = row?.meta ?? {}
  return {
    ...(row ?? {}),
    section:     row?.section   ?? 'hero',
    slug:        row?.slug      ?? '',
    title:       row?.title     ?? '',
    subtitle:    row?.subtitle  ?? '',
    body:        row?.body      ?? '',
    isActive:    row?.isActive  ?? true,
    sortOrder:   row?.sortOrder ?? 0,
    metaRaw:     row?.meta ? JSON.stringify(row.meta, null, 2) : '{}',
    ctaLabel:    (meta.cta_label     as string) ?? 'Mulai Sekarang',
    ctaNote:     (meta.cta_note      as string) ?? 'Gratis · Tidak perlu kartu kredit · Langsung bisa dipakai',
    benefitList: Array.isArray(meta.benefit_list)
      ? (meta.benefit_list as string[]).join('\n')
      : 'Gratis selamanya\nTanpa kartu kredit\nLangsung bisa dipakai',
    ctaUrlGuest:  (meta.cta_url_guest  as string) ?? '/login',
    ctaUrlAuth:   (meta.cta_url_auth   as string) ?? '/main/riwayat',
    heroImageUrl: (meta.hero_image_url as string) ?? '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: syncMetaFields
// ─────────────────────────────────────────────────────────────────────────────
function syncMetaFields(row: EditRow): string {
  const isCTA  = CTA_SECTIONS.includes(row.section ?? '')
  const isHero = HERO_SECTIONS.includes(row.section ?? '')
  if (!isCTA && !isHero) return row.metaRaw
  try {
    const base: Record<string, unknown> = row.metaRaw.trim() === '' || row.metaRaw.trim() === '{}'
      ? {}
      : JSON.parse(row.metaRaw)

    if (isCTA) {
      base.cta_label     = row.ctaLabel
      base.cta_note      = row.ctaNote
      base.benefit_list  = row.benefitList
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
      base.cta_url_guest = row.ctaUrlGuest
      base.cta_url_auth  = row.ctaUrlAuth
    }

    if (isHero) {
      const url = row.heroImageUrl.trim()
      if (url) {
        base.hero_image_url = url
      } else {
        delete base.hero_image_url
      }
    }

    return JSON.stringify(base, null, 2)
  } catch {
    return row.metaRaw
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: SectionBadge
// ─────────────────────────────────────────────────────────────────────────────
function SectionBadge({ section }: { section: string }) {
  const s = SECTION_LABELS[section]
  if (!s) return <Badge variant="light">{section}</Badge>
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-sm bg-sunken border border-border text-xs font-semibold text-bark-800 whitespace-nowrap">
      <s.icon size={13} className={s.iconCls} aria-hidden />
      {s.label}
    </span>
  )
}

function StatusToggle({ row, onToggle, mobile }: { row: ContentRow; onToggle: () => void; mobile?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={row.isActive}
      title={row.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 rounded-pill text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
        mobile ? 'min-h-9 px-3' : 'py-[3px]',
        row.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-muted text-secondary hover:bg-sand-200',
      )}
    >
      <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full', row.isActive ? 'bg-green-500' : 'bg-sand-400')} />
      {row.isActive ? 'Aktif' : 'Nonaktif'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingEditorPage() {
  const [rows, setRows]           = useState<ContentRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<number | null>(null)
  const [filterSection, setFilterSection] = useState<string>('all')
  const [showForm, setShowForm]   = useState(false)
  const [editRow, setEditRow]     = useState<EditRow | null>(null)
  const [jsonErr, setJsonErr]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    if (type === 'ok') sonner.success(msg)
    else sonner.error(msg)
  }

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/landing')
      const j   = await res.json()
      setRows(j.data ?? [])
    } catch {
      showToast('Gagal memuat data', 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])


  function openNew() {
    setEditRow(toEditRow())
    setJsonErr('')
    setShowForm(true)
  }

  function openEdit(row: ContentRow) {
    setEditRow(toEditRow(row))
    setJsonErr('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditRow(null)
    setJsonErr('')
  }

  function updateField<K extends keyof EditRow>(key: K, value: EditRow[K]) {
    setEditRow(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleSave() {
    if (!editRow) return
    const finalMetaRaw = syncMetaFields(editRow)
    let parsedMeta: Record<string, unknown> | null = null
    try {
      const raw = finalMetaRaw.trim()
      parsedMeta = raw === '' || raw === '{}' ? null : JSON.parse(raw)
      setJsonErr('')
    } catch {
      setJsonErr('Format JSON meta tidak valid')
      return
    }
    if (!editRow.slug?.trim())  { setJsonErr('Slug wajib diisi');  return }
    if (!editRow.title?.trim()) { setJsonErr('Title wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/landing?action=upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:        editRow.id,
          section:   editRow.section,
          slug:      editRow.slug,
          title:     editRow.title,
          subtitle:  editRow.subtitle  || null,
          body:      editRow.body      || null,
          meta:      parsedMeta,
          isActive:  editRow.isActive  ?? true,
          sortOrder: editRow.sortOrder ?? 0,
        }),
      })
      const j = await res.json()
      if (!res.ok) { showToast(j.error ?? 'Gagal menyimpan', 'err'); return }
      showToast(editRow.id ? 'Konten berhasil diperbarui' : 'Konten berhasil ditambahkan')
      closeForm()
      fetchRows()
    } catch {
      showToast('Terjadi kesalahan', 'err')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(row: ContentRow) {
    try {
      await fetch('/api/admin/landing?action=toggle_active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
      })
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, isActive: !r.isActive } : r))
    } catch {
      showToast('Gagal mengubah status', 'err')
    }
  }

  async function confirmDelete(id: number) {
    setDeleting(id)
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const j = await res.json()
      if (!res.ok) { showToast(j.error ?? 'Gagal menghapus', 'err'); return }
      showToast('Konten dihapus')
      setRows(prev => prev.filter(r => r.id !== id))
    } catch {
      showToast('Terjadi kesalahan', 'err')
    } finally {
      setDeleting(null)
      setDeleteConfirm(null)
    }
  }

  const displayed = filterSection === 'all'
    ? rows
    : rows.filter(r => r.section === filterSection)

  const sectionCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.section] = (acc[r.section] ?? 0) + 1
    return acc
  }, {})


  const isCTASection  = CTA_SECTIONS.includes(editRow?.section ?? '')
  const isHeroSection = HERO_SECTIONS.includes(editRow?.section ?? '')
  const hasHeroImage = (row: ContentRow) => row.section === 'hero' && typeof row.meta?.hero_image_url === 'string' && !!row.meta.hero_image_url

  const emptyState = (
    <EmptyState
      icon={LayoutTemplate}
      title={filterSection === 'all' ? 'Belum ada konten' : `Belum ada konten ${SECTION_LABELS[filterSection]?.label}`}
      description="Klik tombol “Tambah Konten” untuk mulai menambahkan."
      action={<Button icon={Plus} onClick={openNew}>Tambah Konten</Button>}
    />
  )

  const filterSelect = (id: string) => (
    <Select id={id} aria-label="Filter section" value={filterSection} onChange={e => setFilterSection(e.target.value)} className="w-auto min-w-[170px] min-h-8 py-1 text-sm max-lg:min-h-11 max-lg:text-md max-lg:flex-1">
      <option value="all">Semua ({rows.length})</option>
      {SECTIONS.map(s => <option key={s} value={s}>{SECTION_LABELS[s].label} ({sectionCounts[s] ?? 0})</option>)}
    </Select>
  )

  return (
    <AdminPage title="Landing Page" breadcrumb={[{ label: 'Halaman Publik' }, { label: 'Landing Page' }]}>
      <Alert
        variant="light"
        icon={LayoutTemplate}
        action={<Button variant="outline" size="sm" icon={ExternalLink} href="/" target="_blank" rel="noopener noreferrer">Lihat Landing Page</Button>}
      >
        Kelola konten yang tampil di halaman utama Gizku. Perubahan langsung tayang tanpa deploy ulang.
      </Alert>

      {/* Section stat tiles (act as filters) */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4 max-lg:gap-2.5">
        {SECTIONS.map(s => {
          const info = SECTION_LABELS[s]
          const count = sectionCounts[s] ?? 0
          const active = filterSection === s
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterSection(active ? 'all' : s)}
              className={cn(
                'bg-surface rounded-md shadow-card text-left p-3.5 max-lg:p-2.5 min-h-[72px] transition-colors border-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
                active ? info.activeBorder : 'border-transparent hover:bg-sunken',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <info.icon size={18} className={info.iconCls} aria-hidden />
                <span className="text-[22px] max-lg:text-lg font-bold tabular-nums text-primary leading-none">{count}</span>
              </span>
              <span className="block text-sm max-lg:text-xs font-medium text-bark-700 mt-2 truncate">{info.label}</span>
            </button>
          )
        })}
      </div>

      {/* Desktop */}
      <Card
        outline="brand"
        icon={LayoutTemplate}
        title="Konten Landing Page"
        subtitle={`${displayed.length} item`}
        className="max-lg:hidden"
        noPadding
        tools={
          <>
            <label htmlFor="landing-filter" className="text-sm text-secondary">Filter:</label>
            {filterSelect('landing-filter')}
            <Button size="sm" icon={Plus} onClick={openNew}>Tambah Konten</Button>
          </>
        }
      >
        {loading ? (
          <div className="p-4 flex flex-col gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}</div>
        ) : displayed.length === 0 ? emptyState : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[860px]">
              <thead>
                <tr>
                  {[['Section', 'left'], ['Slug', 'left'], ['Title / Subtitle', 'left'], ['Urutan', 'center'], ['Status', 'center'], ['Aksi', 'right']].map(([h, a]) => (
                    <th key={h} scope="col" className={cn('px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border whitespace-nowrap', a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(row => (
                  <tr key={row.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-3 py-2.5 border-t border-border"><SectionBadge section={row.section} /></td>
                    <td className="px-3 py-2.5 border-t border-border"><Code>{row.slug}</Code></td>
                    <td className="px-3 py-2.5 border-t border-border max-w-[320px]">
                      <p className="text-base font-semibold text-primary truncate">{row.title}</p>
                      {row.subtitle && <p className="text-sm text-secondary truncate mt-0.5">{row.subtitle}</p>}
                      {hasHeroImage(row) && <Badge variant="soft" size="sm" icon={ImageIcon} className="mt-1">Custom Image</Badge>}
                    </td>
                    <td className="px-3 py-2.5 border-t border-border text-center tabular-nums text-base">{row.sortOrder}</td>
                    <td className="px-3 py-2.5 border-t border-border text-center"><StatusToggle row={row} onToggle={() => handleToggle(row)} /></td>
                    <td className="px-3 py-2.5 border-t border-border">
                      <div className="flex gap-1.5 justify-end">
                        <Button variant="outline-primary" size="sm" icon={Pencil} onClick={() => openEdit(row)}>Edit</Button>
                        <Button variant="outline-danger" size="sm" aria-label={`Hapus konten ${row.slug}`} title="Hapus" loading={deleting === row.id} onClick={() => setDeleteConfirm(row.id)} className="px-2">
                          {deleting !== row.id && <Trash2 size={14} aria-hidden />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mobile */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="flex gap-2">
          {filterSelect('landing-filter-m')}
          <Button icon={Plus} onClick={openNew} className="shrink-0">Tambah</Button>
        </div>
        {loading && [1, 2, 3].map(i => <Skeleton key={i} className="h-[140px] rounded-md" />)}
        {!loading && displayed.length === 0 && <Card>{emptyState}</Card>}
        {!loading && displayed.map(row => (
          <article key={row.id} className="bg-surface rounded-md shadow-card p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <SectionBadge section={row.section} />
              <span className="ml-auto"><StatusToggle row={row} onToggle={() => handleToggle(row)} mobile /></span>
            </div>
            <div>
              <p className="font-semibold text-md text-primary leading-snug">{row.title}</p>
              {row.subtitle && <p className="text-sm text-secondary mt-0.5 line-clamp-2">{row.subtitle}</p>}
              <p className="text-xs text-secondary mt-1.5 flex items-center gap-2 flex-wrap">
                <Code>{row.slug}</Code><span>Urutan {row.sortOrder}</span>
                {hasHeroImage(row) && <Badge variant="soft" size="sm" icon={ImageIcon}>Custom Image</Badge>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline-primary" icon={Pencil} onClick={() => openEdit(row)} className="flex-1">Edit</Button>
              <Button variant="outline-danger" aria-label={`Hapus konten ${row.slug}`} loading={deleting === row.id} onClick={() => setDeleteConfirm(row.id)} className="px-3">
                {deleting !== row.id && <Trash2 size={16} aria-hidden />}
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* Delete Confirm */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => deleting === null && setDeleteConfirm(null)}
        closeDisabled={deleting !== null}
        title="Hapus konten ini?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting !== null}>Batal</Button>
            <Button variant="danger" icon={Trash2} loading={deleting !== null} onClick={() => deleteConfirm !== null && confirmDelete(deleteConfirm)}>
              {deleting !== null ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">Tindakan ini tidak bisa dibatalkan. Konten akan dihapus permanen dari database.</p>
      </Modal>

      {/* Edit / Add */}
      <Modal
        open={showForm && !!editRow}
        onClose={closeForm}
        title={editRow?.id ? 'Edit Konten' : 'Tambah Konten Baru'}
        size="lg"
        sheetOnMobile
        bodyClassName="lg:max-h-[620px] lg:overflow-y-auto"
        headerAction={
          <Button size="sm" icon={Save} loading={saving} onClick={handleSave} className="lg:hidden">Simpan</Button>
        }
        footer={
          <>
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              {saving ? 'Menyimpan...' : editRow?.id ? 'Simpan Perubahan' : 'Tambah Konten'}
            </Button>
          </>
        }
      >
        {editRow && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField label="Section" htmlFor="lp-section" required>
                <Select id="lp-section" value={editRow.section} onChange={e => updateField('section', e.target.value)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{SECTION_LABELS[s]?.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Slug" htmlFor="lp-slug" required help="URL-friendly: huruf kecil, angka, tanda hubung.">
                <Input
                  id="lp-slug"
                  value={editRow.slug ?? ''}
                  onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="contoh: hero-main"
                  className="font-mono"
                />
              </FormField>
            </div>
            <FormField label="Title" htmlFor="lp-title" required>
              <Input id="lp-title" value={editRow.title ?? ''} onChange={e => updateField('title', e.target.value)} placeholder="Judul konten yang tampil di halaman" />
            </FormField>
            <FormField label="Subtitle / Deskripsi" htmlFor="lp-subtitle" help="Opsional.">
              <Input id="lp-subtitle" value={editRow.subtitle ?? ''} onChange={e => updateField('subtitle', e.target.value)} placeholder="Deskripsi pendek di bawah judul" />
            </FormField>
            <FormField label="Body" htmlFor="lp-body" help="Untuk deskripsi panjang / blog post.">
              <Textarea id="lp-body" rows={4} value={editRow.body ?? ''} onChange={e => updateField('body', e.target.value)} placeholder="Konten panjang..." />
            </FormField>

            {isHeroSection && (
              <fieldset className="rounded-md border border-border p-4 max-lg:p-3">
                <legend className="px-1.5 text-base font-semibold text-primary flex items-center gap-2">
                  <ImageIcon size={16} className="text-secondary" aria-hidden />Gambar Screenshot App (Hero)
                  <Badge variant="light" size="sm">Opsional</Badge>
                </legend>
                <HeroImageUploader
                  currentUrl={editRow.heroImageUrl}
                  onUploaded={(url) => updateField('heroImageUrl', url)}
                  onRemove={() => updateField('heroImageUrl', '')}
                />
                <p className="text-sm text-secondary mt-3">Kosongkan untuk menggunakan ilustrasi SVG default (phone mockup).</p>
              </fieldset>
            )}

            {isCTASection && (
              <fieldset className="rounded-md border border-border p-4 max-lg:p-3">
                <legend className="px-1.5 text-base font-semibold text-primary flex items-center gap-2">
                  <MousePointerClick size={16} className="text-secondary" aria-hidden />Konfigurasi Tombol CTA
                  <Badge variant="soft" size="sm">{editRow.section === 'hero' ? 'Hero' : 'CTA Bottom'}</Badge>
                </legend>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField label="Label Tombol" htmlFor="lp-cta-label" help="Teks yang tampil di dalam tombol hijau besar.">
                    <Input id="lp-cta-label" value={editRow.ctaLabel} onChange={e => updateField('ctaLabel', e.target.value)} placeholder="Mulai Sekarang" />
                  </FormField>
                  <FormField label="Catatan di bawah tombol" htmlFor="lp-cta-note" help="Opsional. Teks kecil di bawah tombol.">
                    <Input id="lp-cta-note" value={editRow.ctaNote} onChange={e => updateField('ctaNote', e.target.value)} placeholder="Gratis · Tidak perlu kartu kredit" />
                  </FormField>
                  <FormField label="URL — Belum Login" htmlFor="lp-cta-guest" help="Redirect untuk pengunjung belum login.">
                    <Input id="lp-cta-guest" value={editRow.ctaUrlGuest} onChange={e => updateField('ctaUrlGuest', e.target.value)} placeholder="/login" className="font-mono" />
                  </FormField>
                  <FormField label="URL — Sudah Login" htmlFor="lp-cta-auth" help="Redirect untuk user sudah login.">
                    <Input id="lp-cta-auth" value={editRow.ctaUrlAuth} onChange={e => updateField('ctaUrlAuth', e.target.value)} placeholder="/main/riwayat" className="font-mono" />
                  </FormField>
                </div>
                <FormField label="Checklist Keunggulan" htmlFor="lp-cta-benefits" help="Daftar item dengan centang hijau di bawah deskripsi. Satu item per baris." className="mt-4">
                  <Textarea id="lp-cta-benefits" rows={4} value={editRow.benefitList} onChange={e => updateField('benefitList', e.target.value)} placeholder={'Gratis selamanya\nTanpa kartu kredit\nLangsung bisa dipakai'} />
                </FormField>
                <div className="rounded-sm border border-border bg-sunken p-3 mt-4">
                  <p className="text-sm font-semibold text-secondary mb-2">Preview otomatis</p>
                  <div className="flex flex-col items-center gap-2">
                    {editRow.benefitList && editRow.benefitList.trim() && (
                      <ul className="flex flex-col items-start gap-1 w-full px-2 list-none m-0">
                        {editRow.benefitList.split('\n').map((s: string) => s.trim()).filter(Boolean).map((item: string) => (
                          <li key={item} className="flex items-center gap-1.5 text-sm text-bark-700">
                            <CheckCircle2 size={14} className="text-brand" aria-hidden />{item}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span aria-hidden className="px-8 py-3 rounded-pill bg-brand text-white text-base font-bold shadow-sm">
                      {editRow.ctaLabel || 'Mulai Sekarang'}
                    </span>
                    {editRow.ctaNote && <p className="text-sm text-secondary text-center">{editRow.ctaNote}</p>}
                  </div>
                </div>
              </fieldset>
            )}

            <FormField
              label="Meta (JSON)"
              htmlFor="lp-meta"
              labelAside={<Code>{isHeroSection ? 'hero_image_url, cta_label…' : isCTASection ? 'cta_label, benefit_list…' : 'icon, step, image_url…'}</Code>}
              help={(isCTASection || isHeroSection) ? 'Otomatis dari field di atas.' : undefined}
              error={jsonErr || undefined}
            >
              <Textarea
                id="lp-meta"
                rows={(isCTASection || isHeroSection) ? 3 : 5}
                value={(isCTASection || isHeroSection) ? syncMetaFields(editRow) : (editRow.metaRaw ?? '{}')}
                onChange={e => {
                  if (isCTASection || isHeroSection) return
                  updateField('metaRaw', e.target.value)
                  setJsonErr('')
                }}
                readOnly={isCTASection || isHeroSection}
                invalid={!!jsonErr}
                className={cn('font-mono text-sm', (isCTASection || isHeroSection) && 'bg-sunken text-secondary cursor-default')}
              />
            </FormField>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-lg:p-3 rounded-md bg-sunken border border-border">
              <FormField label="Sort Order" htmlFor="lp-sort" help="Angka kecil = tampil lebih awal.">
                <Input id="lp-sort" type="number" inputMode="numeric" value={editRow.sortOrder ?? 0} onChange={e => updateField('sortOrder', parseInt(e.target.value) || 0)} />
              </FormField>
              <div className="lg:pt-7">
                <Switch
                  checked={!!editRow.isActive}
                  onChange={v => updateField('isActive', v)}
                  label={editRow.isActive ? 'Aktif' : 'Nonaktif'}
                  description={`Konten ${editRow.isActive ? 'akan tampil' : 'disembunyikan'}.`}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminPage>
  )
}
