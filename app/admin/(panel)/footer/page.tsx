'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast as sonner } from 'sonner'
import { BookOpen, Eye, EyeOff, Footprints, Link2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import GizkuLogo from '@/components/GizkuLogo'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Badge, Button, Card, Code, EmptyState, FormField, Input, ListRow, Modal, Select, Skeleton, Switch, Textarea, type BadgeVariant,
} from '@/components/admin/ui'
import { cn } from '@/lib/utils'

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

const META_TYPE_BADGE: Record<string, BadgeVariant> = {
  brand:       'secondary',
  tagline:     'light',
  links_group: 'soft',
  social:      'honeysoft',
  copyright:   'secondary',
}

/* ─── Helper ─────────────────────────────────────────────── */
function toast(msg: string, type: 'success' | 'error' = 'success') {
  if (type === 'success') sonner.success(msg)
  else sonner.error(msg)
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


/* ─── Badge ─────────────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const label = META_TYPES.find(m => m.value === type)?.label ?? type
  return <Badge variant={META_TYPE_BADGE[type] ?? 'light'} size="sm">{label}</Badge>
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
    <Card title="Pratinjau Footer" icon={Eye} noPadding>
      <div className="bg-bark-900 px-8 pt-8 pb-6 max-lg:px-5">
        <div className="flex gap-12 max-lg:gap-6 flex-wrap mb-7 pb-6 border-b border-white/10">
          <div className="basis-[200px] shrink-0">
            <div className="flex items-center gap-2.5 mb-2.5">
              <GizkuLogo size={28} />
              <span className="text-white font-bold text-lg">{brand?.title ?? 'Gizku'}</span>
            </div>
            <p className="text-sm text-sand-300 leading-relaxed">{tagline?.subtitle ?? 'AI Nutrition Companion'}</p>
            {socialLinks.length > 0 && (
              <div className="flex gap-2 mt-3.5 flex-wrap">
                {socialLinks.map((l, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-sm bg-bark-800 text-sand-200 text-xs font-semibold">{l.label}</span>
                ))}
              </div>
            )}
          </div>
          {linkGroups.map(g => {
            const links = (g.meta?.links as LinkItem[]) ?? []
            return (
              <div key={g.id} className="basis-[140px] shrink-0">
                <p className="text-xs font-bold text-sand-200 mb-3 uppercase tracking-[0.06em]">{g.title}</p>
                <ul className="list-none p-0 m-0 flex flex-col gap-2">
                  {links.map((l, i) => <li key={i} className="text-sm text-sand-300">{l.label}</li>)}
                </ul>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-sand-300 text-center">
          {copyright?.title ?? `© ${new Date().getFullYear()} Gizku. Dibuat untuk hidup lebih sehat.`}
        </p>
      </div>
    </Card>
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
  const [confirmDelete, setConfirmDelete] = useState<FooterRow | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

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
      setConfirmDelete(null)
      if (form.id === id) { setShowForm(false); setForm(EMPTY_FORM) }
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
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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

  const linkEditor = (form.meta_type === 'links_group' || form.meta_type === 'social') && (
    <fieldset>
      <legend className="text-base font-semibold text-primary mb-2">{form.meta_type === 'social' ? 'Social Media Links' : 'Daftar Link'}</legend>
      <div className="flex flex-col gap-2.5">
        {form.meta_links.length === 0 && <p className="text-sm text-secondary">Belum ada link.</p>}
        {form.meta_links.map((l, i) => (
          <div key={i} className="flex gap-2 items-start max-lg:flex-col max-lg:border max-lg:border-border max-lg:rounded-md max-lg:p-3 max-lg:bg-sunken">
            <div className="flex gap-2 w-full lg:w-[38%] lg:shrink-0 items-center">
              <Input aria-label={`Label link ${i + 1}`} value={l.label} onChange={e => setLink(i, 'label', e.target.value)} placeholder="Label (misal: Instagram)" />
              <Button variant="outline-danger" aria-label={`Hapus link ${i + 1}`} onClick={() => removeLink(i)} className="px-3 shrink-0 lg:hidden"><X size={16} aria-hidden /></Button>
            </div>
            <Input aria-label={`URL link ${i + 1}`} value={l.url} onChange={e => setLink(i, 'url', e.target.value)} placeholder="URL (misal: https://instagram.com/gizku)" />
            <Button variant="outline-danger" aria-label={`Hapus link ${i + 1}`} onClick={() => removeLink(i)} className="px-2.5 shrink-0 max-lg:hidden"><X size={14} aria-hidden /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline-primary" size="sm" icon={Plus} onClick={addLink} className="mt-2.5">Tambah Link</Button>
    </fieldset>
  )

  const formCard = (
    <Card
      outline="brand"
      icon={form.id ? Pencil : Plus}
      title={form.id ? `Edit Item: ${form.slug}` : 'Tambah Item'}
      tools={<Button variant="tool" size="sm" aria-label="Tutup form" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="px-2"><X size={16} aria-hidden /></Button>}
      footer={
        <div className="flex justify-end gap-2 max-lg:flex-col-reverse">
          <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Batal</Button>
          <Button icon={Save} loading={saving} onClick={save}>{saving ? 'Menyimpan…' : form.id ? 'Update' : 'Simpan'}</Button>
        </div>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <FormField label="Slug" htmlFor="ft-slug" required>
        <Select id="ft-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}>
          <option value="">— Pilih slug —</option>
          {SLUG_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label} ({p.value})</option>)}
        </Select>
      </FormField>
      <FormField label="Tipe Konten" htmlFor="ft-type" required>
        <Select id="ft-type" value={form.meta_type} onChange={e => setForm(f => ({ ...f, meta_type: e.target.value, meta_links: [] }))}>
          {META_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </FormField>
      <FormField label="Title" htmlFor="ft-title" required>
        <Input
          id="ft-title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder={form.meta_type === 'copyright' ? '© 2025 Gizku. Semua hak dilindungi.' : form.meta_type === 'brand' ? 'Gizku' : 'Judul atau nama grup'}
        />
      </FormField>
      <FormField label="Subtitle" htmlFor="ft-subtitle">
        <Input id="ft-subtitle" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Sub-teks (opsional)" />
      </FormField>
      <div className="grid grid-cols-2 gap-4 items-end">
        <FormField label="Urutan" htmlFor="ft-sort">
          <Input id="ft-sort" type="number" inputMode="numeric" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
        </FormField>
        <div className="pb-2">
          <Switch checked={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} label={form.isActive ? 'Aktif' : 'Nonaktif'} />
        </div>
      </div>
      {linkEditor}
      <FormField label="Body / Keterangan Tambahan" htmlFor="ft-body">
        <Textarea id="ft-body" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={2} placeholder="Teks tambahan (opsional)" />
      </FormField>
    </Card>
  )

  const linkCount = (r: FooterRow) => Array.isArray(r.meta?.links) ? (r.meta?.links as LinkItem[]).length : 0
  const guide = (
    <Card title="Panduan Slug Footer" icon={BookOpen} noPadding>
      <dl className="divide-y divide-border">
        {SLUG_PRESETS.map(p => (
          <div key={p.value} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt><Code>{p.value}</Code></dt>
            <dd className="text-base text-bark-700 text-right">{p.label}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )

  const emptyList = (
    <EmptyState
      icon={Footprints}
      title="Belum ada item footer"
      description="Klik “Tambah Item” untuk mulai mengonfigurasi footer."
      action={<Button icon={Plus} onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}>Tambah Item</Button>}
    />
  )

  return (
    <AdminPage title="Konfigurasi Footer" breadcrumb={[{ label: 'Halaman Publik' }, { label: 'Footer' }]}>
      {preview && <FooterPreview rows={rows} />}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        <div className="xl:col-span-7 flex flex-col gap-5 max-lg:gap-4 min-w-0">
          <Card
            outline="brand"
            icon={Footprints}
            title="Item Footer"
            subtitle="Teks, link, dan konten footer landing page Gizku"
            noPadding
            tools={
              <>
                <Button variant="outline" size="sm" icon={preview ? EyeOff : Eye} aria-pressed={preview} onClick={() => setPreview(p => !p)}>
                  {preview ? 'Tutup Preview' : 'Preview'}
                </Button>
                <Button size="sm" icon={Plus} onClick={() => { setForm(EMPTY_FORM); setShowForm(true); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }}>Tambah Item</Button>
              </>
            }
          >
            {loading ? (
              <div className="p-4 flex flex-col gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}</div>
            ) : rows.length === 0 ? emptyList : (
              <>
                <div className="max-lg:hidden overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px]">
                    <thead>
                      <tr>
                        {['Slug', 'Tipe', 'Title', 'Link', 'Urutan', 'Status', ''].map((h, i) => (
                          <th key={i} scope="col" className={cn('px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border whitespace-nowrap', i === 4 ? 'text-center' : 'text-left')}>
                            {h || <span className="sr-only">Aksi</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.id} className={cn('hover:bg-muted/60 transition-colors', form.id === r.id && showForm && 'bg-green-50', !r.isActive && 'text-secondary')}>
                          <td className="px-3 py-2.5 border-t border-border"><Code>{r.slug}</Code></td>
                          <td className="px-3 py-2.5 border-t border-border"><TypeBadge type={(r.meta?.type as string) ?? 'unknown'} /></td>
                          <td className="px-3 py-2.5 border-t border-border text-base font-semibold max-w-[200px] truncate">{r.title}</td>
                          <td className="px-3 py-2.5 border-t border-border text-sm text-secondary whitespace-nowrap">{linkCount(r) ? `${linkCount(r)} link` : '—'}</td>
                          <td className="px-3 py-2.5 border-t border-border text-center tabular-nums">{r.sortOrder}</td>
                          <td className="px-3 py-2.5 border-t border-border">
                            <button
                              type="button"
                              onClick={() => toggleActive(r.id, r.isActive)}
                              aria-pressed={r.isActive}
                              title={r.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                              className={cn('px-2 py-[3px] rounded-pill text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500', r.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-muted text-secondary hover:bg-sand-200')}
                            >
                              {r.isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 border-t border-border">
                            <div className="flex gap-1.5 justify-end">
                              <Button variant="outline-primary" size="sm" icon={Pencil} onClick={() => edit(r)}>Edit</Button>
                              <Button variant="outline-danger" size="sm" aria-label={`Hapus ${r.slug}`} title="Hapus" loading={deleting === r.id} onClick={() => setConfirmDelete(r)} className="px-2">
                                {deleting !== r.id && <Trash2 size={14} aria-hidden />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden">
                  {rows.map(r => (
                    <ListRow
                      key={r.id}
                      leading={<span className="w-8 h-8 rounded-full bg-muted text-bark-800 text-sm font-semibold flex items-center justify-center shrink-0 tabular-nums">{r.sortOrder}</span>}
                      title={<span className={cn(!r.isActive && 'text-secondary')}>{r.title}</span>}
                      meta={<span className="inline-flex items-center gap-1.5 flex-wrap">{r.slug} <TypeBadge type={(r.meta?.type as string) ?? 'unknown'} />{linkCount(r) > 0 && <span className="inline-flex items-center gap-0.5"><Link2 size={12} aria-hidden />{linkCount(r)}</span>}{!r.isActive && <Badge variant="light" size="sm">Nonaktif</Badge>}</span>}
                      trailing={
                        <>
                          <Button variant="outline-primary" aria-label={`Edit ${r.slug}`} onClick={() => edit(r)} className="px-3"><Pencil size={16} aria-hidden /></Button>
                          <Button variant="outline-danger" aria-label={`Hapus ${r.slug}`} loading={deleting === r.id} onClick={() => setConfirmDelete(r)} className="px-3">{deleting !== r.id && <Trash2 size={16} aria-hidden />}</Button>
                        </>
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </Card>
          <div className="max-xl:hidden">{guide}</div>
        </div>

        <div ref={formRef} className="xl:col-span-5 scroll-mt-20 min-w-0">
          {showForm ? formCard : (
            <Card title="Form Item" icon={Pencil} className="max-xl:hidden">
              <EmptyState icon={Pencil} title="Pilih item untuk diedit" description="Klik Edit pada salah satu item, atau tambah item baru." className="p-8" />
            </Card>
          )}
        </div>
        <div className="xl:hidden">{guide}</div>
      </div>

      <Modal
        open={!!confirmDelete}
        onClose={() => deleting === null && setConfirmDelete(null)}
        closeDisabled={deleting !== null}
        title="Hapus item ini?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting !== null}>Batal</Button>
            <Button variant="danger" icon={Trash2} loading={deleting !== null} onClick={() => confirmDelete && del(confirmDelete.id)}>Hapus</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          Item <Code>{confirmDelete?.slug}</Code> akan dihapus dari footer landing page.
        </p>
      </Modal>
    </AdminPage>
  )
}
