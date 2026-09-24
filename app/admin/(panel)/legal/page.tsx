'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast as sonner } from 'sonner'
import {
  ChevronLeft, ChevronRight, Eye, FilePlus2, FileText, Info, Layers, Pencil, Plus, Save, Smartphone, Trash2, X,
} from 'lucide-react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Badge, Button, Card, EmptyState, FormField, Input, ListRow, Modal, Select, Skeleton, Tabs, Textarea,
  useDialogBehavior,
} from '@/components/admin/ui'
import { cn } from '@/lib/utils'

/* ─── Types ─────────────────────────────────────────────── */
/* ─── Types ─────────────────────────────────────────────── */
type LangContent = { title: string; bodyHtml: string }
type DocumentRow = {
  id: string
  typeKey: string
  slug: string
  updatedAt: string
  langs: { id: LangContent; en: LangContent }
}
type DocType = { key: string; label: string; builtin: boolean; usedCount: number }
type AboutLang = { description: string; disclaimer: string }
type AboutState = { id: AboutLang; en: AboutLang }
type DraftDoc = { id: string | null; typeKey: string; langs: { id: LangContent; en: LangContent } }

const EMPTY_LANG: LangContent = { title: '', bodyHtml: '' }

/* ─── Helpers ───────────────────────────────────────────── */
function toast(msg: string, type: 'success' | 'error' = 'success') {
  if (type === 'success') sonner.success(msg)
  else sonner.error(msg)
}

function slugify(str: string) {
  return (str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'dokumen'
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}


/* ─── Main Page ─────────────────────────────────────────── */
export default function LegalDocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [view, setView] = useState<'list' | 'editor'>('list')
  const [documentTypes, setDocumentTypes] = useState<DocType[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [about, setAbout] = useState<AboutState>({ id: { description: '', disclaimer: '' }, en: { description: '', disclaimer: '' } })

  const [draft, setDraft] = useState<DraftDoc | null>(null)
  const [activeLang, setActiveLang] = useState<'id' | 'en'>('id')
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')

  const [typesModalOpen, setTypesModalOpen] = useState(false)
  const [typesModalNewName, setTypesModalNewName] = useState('')

  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [aboutDraft, setAboutDraft] = useState<AboutState | null>(null)
  const [aboutActiveLang, setAboutActiveLang] = useState<'id' | 'en'>('id')
  const [savingAbout, setSavingAbout] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLang, setPreviewLang] = useState<'id' | 'en'>('id')
  const [previewView, setPreviewView] = useState<'about' | 'detail'>('about')
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  // In-app confirmation (replaces window.confirm for deletes)
  const [confirmReq, setConfirmReq] = useState<{ title: string; message: string; label: string; onConfirm: () => void } | null>(null)
  function askDeleteDoc(id: string) {
    const doc = documents.find(d => d.id === id)
    setConfirmReq({
      title: 'Hapus dokumen ini?',
      message: `“${doc?.langs.id.title || 'Dokumen tanpa judul'}” akan dihapus dan tidak lagi tampil di aplikasi.`,
      label: 'Hapus Dokumen',
      onConfirm: () => deleteDoc(id),
    })
  }
  function askRemoveType(key: string) {
    const t = documentTypes.find(x => x.key === key)
    setConfirmReq({
      title: 'Hapus jenis dokumen ini?',
      message: `Jenis “${t?.label ?? key}” akan dihapus dari pilihan.`,
      label: 'Hapus Jenis',
      onConfirm: () => removeType(key),
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/legal')
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal memuat data', 'error'); return }
      setDocumentTypes(j.documentTypes ?? [])
      setDocuments(j.documents ?? [])
      setAbout(j.about ?? { id: { description: '', disclaimer: '' }, en: { description: '', disclaimer: '' } })
    } catch {
      toast('Gagal menghubungi server', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Editor ───────────────────────────────────────────── */
  function openNewDoc() {
    setDraft({ id: null, typeKey: documentTypes[0]?.key ?? '', langs: { id: { ...EMPTY_LANG }, en: { ...EMPTY_LANG } } })
    setActiveLang('id')
    setAddTypeOpen(false)
    setView('editor')
  }

  function openEditDoc(doc: DocumentRow) {
    setDraft({ id: doc.id, typeKey: doc.typeKey, langs: { id: { ...doc.langs.id }, en: { ...doc.langs.en } } })
    setActiveLang('id')
    setAddTypeOpen(false)
    setView('editor')
  }

  function backToList() {
    setView('list')
    setDraft(null)
  }

  function setDraftLang(lang: 'id' | 'en', field: 'title' | 'bodyHtml', value: string) {
    setDraft(d => d && ({ ...d, langs: { ...d.langs, [lang]: { ...d.langs[lang], [field]: value } } }))
  }

  async function confirmAddType() {
    const name = newTypeName.trim()
    if (!name) return
    try {
      const res = await fetch('/api/admin/legal?action=create_type', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: name }),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menambah jenis dokumen', 'error'); return }
      setDocumentTypes(t => [...t, j.type])
      setDraft(d => d && ({ ...d, typeKey: j.type.key }))
      setAddTypeOpen(false)
      setNewTypeName('')
    } catch {
      toast('Terjadi kesalahan', 'error')
    }
  }

  async function saveDraft() {
    if (!draft) return
    if (!draft.langs.id.title.trim()) { toast('Judul (Bahasa Indonesia) wajib diisi', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/legal?action=upsert_document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menyimpan dokumen', 'error'); return }
      toast('Dokumen tersimpan')
      await load()
      backToList()
    } catch {
      toast('Terjadi kesalahan', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteDoc(id: string) {
    setConfirmReq(null)
    setDeletingId(id)
    try {
      const res = await fetch('/api/admin/legal?action=delete_document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menghapus dokumen', 'error'); return }
      toast('Dokumen dihapus')
      await load()
      if (view === 'editor' && draft?.id === id) backToList()
    } catch {
      toast('Terjadi kesalahan', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  /* ── Document Types modal ────────────────────────────────── */
  async function addTypeFromModal() {
    const name = typesModalNewName.trim()
    if (!name) return
    try {
      const res = await fetch('/api/admin/legal?action=create_type', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: name }),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menambah jenis dokumen', 'error'); return }
      setDocumentTypes(t => [...t, j.type])
      setTypesModalNewName('')
    } catch {
      toast('Terjadi kesalahan', 'error')
    }
  }

  async function removeType(key: string) {
    setConfirmReq(null)
    try {
      const res = await fetch('/api/admin/legal?action=delete_type', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menghapus jenis dokumen', 'error'); return }
      setDocumentTypes(t => t.filter(x => x.key !== key))
    } catch {
      toast('Terjadi kesalahan', 'error')
    }
  }

  /* ── About content modal ─────────────────────────────────── */
  function openAboutModal() {
    setAboutDraft({ id: { ...about.id }, en: { ...about.en } })
    setAboutActiveLang('id')
    setAboutModalOpen(true)
  }

  function setAboutField(lang: 'id' | 'en', field: 'description' | 'disclaimer', value: string) {
    setAboutDraft(d => d && ({ ...d, [lang]: { ...d[lang], [field]: value } }))
  }

  async function saveAboutContent() {
    if (!aboutDraft) return
    setSavingAbout(true)
    try {
      const res = await fetch('/api/admin/legal?action=upsert_about', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aboutDraft),
      })
      const j = await res.json()
      if (!res.ok) { toast(j.error ?? 'Gagal menyimpan konten', 'error'); return }
      setAbout(aboutDraft)
      setAboutModalOpen(false)
      toast('Konten Tentang Aplikasi tersimpan')
    } catch {
      toast('Terjadi kesalahan', 'error')
    } finally {
      setSavingAbout(false)
    }
  }

  /* ── Preview ──────────────────────────────────────────────── */
  function openPreview() {
    setPreviewView('about')
    setPreviewLang('id')
    setPreviewOpen(true)
  }
  const previewDoc = previewSlug ? documents.find(d => d.slug === previewSlug) : null


  const editorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (view === 'editor' && typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [view, draft?.id])

  const crumbs = [{ label: 'Halaman Publik' }, { label: 'Dokumen Legal' }]

  if (loading) {
    return (
      <AdminPage title="Dokumen Legal" breadcrumb={crumbs}>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Skeleton className="xl:col-span-5 h-[360px] rounded-md" />
          <Skeleton className="xl:col-span-7 h-[480px] rounded-md" />
        </div>
      </AdminPage>
    )
  }

  return (
    <AdminPage title="Dokumen Legal" breadcrumb={crumbs}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        <div className="xl:col-span-5 flex flex-col gap-5 max-lg:gap-4 min-w-0 max-xl:order-2">
          <ListView
            documents={documents}
            documentTypes={documentTypes}
            deletingId={deletingId}
            activeId={view === 'editor' ? draft?.id ?? null : null}
            onNewDoc={openNewDoc}
            onEditDoc={openEditDoc}
            onOpenTypesModal={() => setTypesModalOpen(true)}
          />
          <Card
            title="Konten Halaman Tentang Aplikasi"
            icon={Info}
            tools={
              <>
                <Button variant="outline" size="sm" icon={Eye} onClick={openPreview}>Preview</Button>
                <Button variant="outline-primary" size="sm" icon={Pencil} onClick={openAboutModal}>Edit</Button>
              </>
            }
          >
            <p className="text-base text-bark-700 leading-normal">{about.id.description || <em className="not-italic text-secondary">Belum diisi</em>}</p>
            <p className="text-sm text-secondary leading-normal mt-2.5"><strong className="text-primary">Disclaimer:</strong> {about.id.disclaimer || '—'}</p>
          </Card>
          <Alert variant="light">
            Isi dokumen disanitasi (allowlist tag: paragraf, judul H3, list, tebal, miring) sebelum disimpan. Setiap dokumen yang disimpan langsung terbit dan diambil aplikasi berdasarkan slug-nya.
          </Alert>
        </div>

        <div ref={editorRef} className="xl:col-span-7 min-w-0 scroll-mt-20 max-xl:order-1">
          {view === 'editor' && draft ? (
            <EditorView
              draft={draft}
              documentTypes={documentTypes}
              activeLang={activeLang}
              setActiveLang={setActiveLang}
              setDraftLang={setDraftLang}
              setDraftType={(typeKey) => setDraft(d => d && ({ ...d, typeKey }))}
              addTypeOpen={addTypeOpen}
              setAddTypeOpen={setAddTypeOpen}
              newTypeName={newTypeName}
              setNewTypeName={setNewTypeName}
              confirmAddType={confirmAddType}
              onBack={backToList}
              onSave={saveDraft}
              onDelete={() => draft.id && askDeleteDoc(draft.id)}
              saving={saving}
              deleting={deletingId === draft.id}
            />
          ) : (
            <Card title="Edit Dokumen" icon={Pencil} className="max-xl:hidden">
              <EmptyState
                icon={FileText}
                title="Pilih dokumen untuk diedit"
                description="Klik Edit pada salah satu dokumen, atau buat dokumen baru."
                action={<Button icon={FilePlus2} onClick={openNewDoc}>Dokumen Baru</Button>}
              />
            </Card>
          )}
        </div>
      </div>

      <TypesModal
        open={typesModalOpen}
        types={documentTypes}
        newName={typesModalNewName}
        setNewName={setTypesModalNewName}
        onAdd={addTypeFromModal}
        onRemove={askRemoveType}
        onClose={() => setTypesModalOpen(false)}
      />

      {aboutDraft && (
        <AboutModal
          open={aboutModalOpen}
          draft={aboutDraft}
          activeLang={aboutActiveLang}
          setActiveLang={setAboutActiveLang}
          setField={setAboutField}
          onSave={saveAboutContent}
          onClose={() => setAboutModalOpen(false)}
          saving={savingAbout}
        />
      )}

      <PreviewPanel
        open={previewOpen}
        about={about}
        documents={documents}
        lang={previewLang}
        setLang={setPreviewLang}
        view={previewView}
        previewDoc={previewDoc ?? null}
        onOpenDoc={(slug) => { setPreviewSlug(slug); setPreviewView('detail') }}
        onBackAbout={() => { setPreviewView('about'); setPreviewSlug(null) }}
        onClose={() => setPreviewOpen(false)}
      />

      <Modal
        open={!!confirmReq}
        onClose={() => setConfirmReq(null)}
        title={confirmReq?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmReq(null)}>Batal</Button>
            <Button variant="danger" icon={Trash2} onClick={() => confirmReq?.onConfirm()}>{confirmReq?.label}</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">{confirmReq?.message}</p>
      </Modal>
    </AdminPage>
  )
}

/* ─── List View ─────────────────────────────────────────── */
function LangBadges({ doc }: { doc: DocumentRow }) {
  return (
    <span className="inline-flex gap-1">
      <Badge variant={doc.langs.id.title ? 'soft' : 'light'} size="sm">ID</Badge>
      <Badge variant={doc.langs.en.title ? 'soft' : 'light'} size="sm">{doc.langs.en.title ? 'EN' : 'EN belum'}</Badge>
    </span>
  )
}

function ListView({
  documents, documentTypes, deletingId, activeId, onNewDoc, onEditDoc, onOpenTypesModal,
}: {
  documents: DocumentRow[]
  documentTypes: DocType[]
  deletingId: string | null
  activeId: string | null
  onNewDoc: () => void
  onEditDoc: (d: DocumentRow) => void
  onOpenTypesModal: () => void
}) {
  const typeLabel = (key: string) => documentTypes.find(t => t.key === key)?.label ?? key

  return (
    <Card
      outline="brand"
      icon={FileText}
      title="Dokumen Legal"
      subtitle="Syarat & Ketentuan, Kebijakan Privasi, dan lainnya"
      noPadding
      tools={
        <div className="max-lg:hidden flex gap-1.5">
          <Button variant="outline" size="sm" icon={Layers} onClick={onOpenTypesModal}>Kelola Jenis</Button>
          <Button size="sm" icon={Plus} onClick={onNewDoc}>Dokumen Baru</Button>
        </div>
      }
      footer={
        <div className="lg:hidden grid grid-cols-2 gap-2">
          <Button variant="outline" icon={Layers} onClick={onOpenTypesModal}>Kelola Jenis</Button>
          <Button icon={Plus} onClick={onNewDoc}>Dokumen Baru</Button>
        </div>
      }
    >
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada dokumen legal" description="Klik “Dokumen Baru” untuk mulai menambahkan." />
      ) : (
        <>
          <div className="max-lg:hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Dokumen', 'Bahasa', 'Diubah', ''].map((h, i) => (
                    <th key={i} scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left whitespace-nowrap">
                      {h || <span className="sr-only">Aksi</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className={cn('hover:bg-muted/60 transition-colors', activeId === doc.id && 'bg-green-50 hover:bg-green-50')}>
                    <td className="px-3 py-2.5 border-t border-border">
                      <p className="text-base font-semibold text-primary">{doc.langs.id.title || <em className="not-italic text-secondary">(tanpa judul)</em>}</p>
                      <p className="text-xs text-secondary mt-0.5">{typeLabel(doc.typeKey)} · /legal/{doc.slug}</p>
                    </td>
                    <td className="px-3 py-2.5 border-t border-border"><LangBadges doc={doc} /></td>
                    <td className="px-3 py-2.5 border-t border-border text-sm text-secondary whitespace-nowrap">{fmtDate(doc.updatedAt)}</td>
                    <td className="px-3 py-2.5 border-t border-border text-right">
                      <Button variant="outline-primary" size="sm" icon={Pencil} onClick={() => onEditDoc(doc)} loading={deletingId === doc.id}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden">
            {documents.map(doc => (
              <ListRow
                key={doc.id}
                onClick={() => onEditDoc(doc)}
                leading={<span aria-hidden className="w-9 h-9 rounded-sm bg-green-50 text-brand flex items-center justify-center shrink-0"><FileText size={18} /></span>}
                title={doc.langs.id.title || '(tanpa judul)'}
                meta={<span className="inline-flex items-center gap-2 flex-wrap">{fmtDate(doc.updatedAt)} <LangBadges doc={doc} /></span>}
                trailing={<ChevronRight size={18} className="text-secondary" aria-hidden />}
                className={activeId === doc.id ? 'bg-green-50' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

/* ─── Editor View ───────────────────────────────────────── */
function EditorView({
  draft, documentTypes, activeLang, setActiveLang, setDraftLang, setDraftType,
  addTypeOpen, setAddTypeOpen, newTypeName, setNewTypeName, confirmAddType,
  onBack, onSave, onDelete, saving, deleting,
}: {
  draft: DraftDoc
  documentTypes: DocType[]
  activeLang: 'id' | 'en'
  setActiveLang: (l: 'id' | 'en') => void
  setDraftLang: (lang: 'id' | 'en', field: 'title' | 'bodyHtml', value: string) => void
  setDraftType: (typeKey: string) => void
  addTypeOpen: boolean
  setAddTypeOpen: (v: boolean) => void
  newTypeName: string
  setNewTypeName: (v: string) => void
  confirmAddType: () => void
  onBack: () => void
  onSave: () => void
  onDelete: () => void
  saving: boolean
  deleting: boolean
}) {
  const slugPreview = slugify(draft.langs.id.title)

  return (
    <Card
      outline="brand"
      icon={draft.id ? Pencil : FilePlus2}
      title={draft.id ? 'Edit Dokumen' : 'Dokumen Baru'}
      tools={<Button variant="outline" size="sm" icon={ChevronLeft} onClick={onBack}>Kembali</Button>}
      footer={
        <div className="flex items-center gap-2 flex-wrap max-lg:flex-col-reverse max-lg:items-stretch">
          {draft.id && (
            <Button variant="outline-danger" icon={Trash2} onClick={onDelete} loading={deleting}>{deleting ? 'Menghapus…' : 'Hapus Dokumen'}</Button>
          )}
          <div className="flex-1 max-lg:hidden" />
          <Button variant="outline" onClick={onBack}>Batal</Button>
          <Button icon={Save} onClick={onSave} loading={saving}>{saving ? 'Menyimpan…' : 'Simpan Dokumen'}</Button>
        </div>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <FormField label="Jenis Dokumen" htmlFor="lg-type">
        <Select
          id="lg-type"
          value={draft.typeKey}
          onChange={e => {
            if (e.target.value === '__add_new__') { setAddTypeOpen(true); return }
            setDraftType(e.target.value)
          }}
        >
          {documentTypes.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          <option value="__add_new__">+ Tambah jenis baru…</option>
        </Select>
      </FormField>
      {addTypeOpen && (
        <div className="flex gap-2 -mt-1 max-lg:flex-col">
          <Input aria-label="Nama jenis dokumen baru" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Nama jenis dokumen baru" />
          <div className="flex gap-2 shrink-0">
            <Button icon={Plus} onClick={confirmAddType} className="max-lg:flex-1">Tambah</Button>
            <Button variant="outline" onClick={() => { setAddTypeOpen(false); setNewTypeName('') }} className="max-lg:flex-1">Batal</Button>
          </div>
        </div>
      )}

      <div>
        <Tabs
          variant="tabs"
          ariaLabel="Bahasa dokumen"
          idPrefix="legal-lang"
          items={[{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }]}
          value={activeLang}
          onChange={setActiveLang}
          className="lg:border-b lg:border-border"
        />
      </div>

      <div role="tabpanel" id="legal-lang-panel-id" aria-labelledby="legal-lang-tab-id" className={cn('flex-col gap-4', activeLang === 'id' ? 'flex' : 'hidden')}>
        <FormField label="Judul" htmlFor="lg-title-id">
          <Input id="lg-title-id" value={draft.langs.id.title} onChange={e => setDraftLang('id', 'title', e.target.value)} placeholder="mis. Syarat & Ketentuan" />
        </FormField>
        <div>
          <p className="mb-1.5 text-base font-semibold text-primary">Isi Dokumen</p>
          <RichTextEditor
            value={draft.langs.id.bodyHtml}
            onChange={html => setDraftLang('id', 'bodyHtml', html)}
            placeholder="Tulis isi dokumen di sini…"
            resetKey={`${draft.id ?? 'new'}-id`}
            ariaLabel="Isi dokumen (Bahasa Indonesia)"
          />
        </div>
      </div>

      <div role="tabpanel" id="legal-lang-panel-en" aria-labelledby="legal-lang-tab-en" className={cn('flex-col gap-4', activeLang === 'en' ? 'flex' : 'hidden')}>
        <FormField label="Title" htmlFor="lg-title-en">
          <Input id="lg-title-en" value={draft.langs.en.title} onChange={e => setDraftLang('en', 'title', e.target.value)} placeholder="e.g. Terms & Conditions" />
        </FormField>
        <div>
          <p className="mb-1.5 text-base font-semibold text-primary">Document Content</p>
          <RichTextEditor
            value={draft.langs.en.bodyHtml}
            onChange={html => setDraftLang('en', 'bodyHtml', html)}
            placeholder="Write document content here…"
            resetKey={`${draft.id ?? 'new'}-en`}
            ariaLabel="Document content (English)"
          />
        </div>
      </div>

      <FormField label="Slug" help="URL publik dibentuk dari judul Bahasa Indonesia.">
        <div className="bg-sunken border border-border rounded-sm px-3 py-2 text-sm text-bark-700 font-mono break-all">/legal/{slugPreview}</div>
      </FormField>
    </Card>
  )
}

/* ─── Document Types Modal ──────────────────────────────── */
function TypesModal({
  open, types, newName, setNewName, onAdd, onRemove, onClose,
}: {
  open: boolean
  types: DocType[]
  newName: string
  setNewName: (v: string) => void
  onAdd: () => void
  onRemove: (key: string) => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kelola Jenis Dokumen"
      size="sm"
      sheetOnMobile
      footer={
        <form className="flex gap-2 w-full" onSubmit={e => { e.preventDefault(); onAdd() }}>
          <Input aria-label="Nama jenis baru" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama jenis baru" />
          <Button type="submit" icon={Plus} disabled={!newName.trim()} className="shrink-0">Tambah</Button>
        </form>
      }
    >
      <ul className="list-none m-0 p-0 flex flex-col gap-2">
        {types.map(t => (
          <li key={t.key} className="flex justify-between items-center gap-3 px-3 py-2.5 bg-sunken border border-border rounded-sm">
            <div className="min-w-0">
              <p className="text-base font-semibold text-primary">{t.label}</p>
              <p className="text-xs text-secondary mt-0.5">{t.usedCount} dokumen · {t.builtin ? 'bawaan sistem' : 'kustom'}</p>
            </div>
            {!t.builtin && t.usedCount === 0 && (
              <Button variant="outline-danger" size="sm" icon={Trash2} onClick={() => onRemove(t.key)}>Hapus</Button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  )
}

/* ─── About Content Modal ───────────────────────────────── */
function AboutModal({
  open, draft, activeLang, setActiveLang, setField, onSave, onClose, saving,
}: {
  open: boolean
  draft: AboutState
  activeLang: 'id' | 'en'
  setActiveLang: (l: 'id' | 'en') => void
  setField: (lang: 'id' | 'en', field: 'description' | 'disclaimer', value: string) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Konten Halaman Tentang Aplikasi"
      size="md"
      sheetOnMobile
      headerAction={<Button size="sm" icon={Save} loading={saving} onClick={onSave} className="lg:hidden">Simpan</Button>}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button icon={Save} loading={saving} onClick={onSave}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          variant="tabs"
          ariaLabel="Bahasa konten"
          items={[{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }]}
          value={activeLang}
          onChange={setActiveLang}
          className="lg:border-b lg:border-border"
        />
        {(['id', 'en'] as const).map(l => (
          <div key={l} className={cn('flex-col gap-4', activeLang === l ? 'flex' : 'hidden')}>
            <FormField label={l === 'id' ? 'Deskripsi Aplikasi' : 'App Description'} htmlFor={`about-desc-${l}`}>
              <Textarea id={`about-desc-${l}`} value={draft[l].description} onChange={e => setField(l, 'description', e.target.value)} rows={3} />
            </FormField>
            <FormField label="Disclaimer" htmlFor={`about-disc-${l}`}>
              <Textarea id={`about-disc-${l}`} value={draft[l].disclaimer} onChange={e => setField(l, 'disclaimer', e.target.value)} rows={4} />
            </FormField>
          </div>
        ))}
      </div>
    </Modal>
  )
}

/* ─── Preview Panel ─────────────────────────────────────── */
function PreviewPanel({
  open, about, documents, lang, setLang, view, previewDoc, onOpenDoc, onBackAbout, onClose,
}: {
  open: boolean
  about: AboutState
  documents: DocumentRow[]
  lang: 'id' | 'en'
  setLang: (l: 'id' | 'en') => void
  view: 'about' | 'detail'
  previewDoc: DocumentRow | null
  onOpenDoc: (slug: string) => void
  onBackAbout: () => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogBehavior(open, onClose, panelRef)
  if (!open || typeof document === 'undefined') return null

  const aboutLang = about[lang] ?? about.id
  const docLang = previewDoc ? (previewDoc.langs[lang]?.title ? previewDoc.langs[lang] : previewDoc.langs.id) : null
  const docBody = previewDoc?.langs[lang]?.bodyHtml

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-bark-900/45 animate-[fadeIn_150ms_ease-out]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Preview Tentang Aplikasi"
        tabIndex={-1}
        className="absolute top-0 right-0 h-full w-[380px] max-w-full bg-sunken shadow-[-8px_0_24px_rgba(36,30,25,0.18)] flex flex-col focus:outline-none"
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border bg-surface shrink-0">
          <Smartphone size={18} className="text-secondary" aria-hidden />
          <h2 className="text-md font-semibold text-primary flex-1">Preview — Tentang Aplikasi</h2>
          <button type="button" onClick={onClose} aria-label="Tutup preview" className="w-10 h-10 rounded-sm text-secondary hover:bg-muted flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex justify-center gap-2 pt-3.5 shrink-0" role="group" aria-label="Bahasa pratinjau">
          {(['id', 'en'] as const).map(l => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={cn('min-h-9 px-4 rounded-pill text-sm font-semibold border', lang === l ? 'bg-brand text-white border-brand' : 'bg-surface text-bark-800 border-border-strong')}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto flex justify-center p-5">
          <div className="w-[300px] bg-sunken border-8 border-bark-900 rounded-[36px] overflow-hidden shadow-md flex flex-col h-[620px] shrink-0">
            <div className="flex justify-between px-[18px] pt-2.5 pb-1 text-xs font-bold text-primary shrink-0">
              <span>9:41</span><span aria-hidden>•••</span>
            </div>

            {view === 'about' && (
              <div className="flex-1 overflow-y-auto px-[18px] pb-6">
                <div className="text-center pt-4 pb-2.5">
                  <div className="text-[21px] font-bold text-primary">Gizku</div>
                  <div className="text-xs text-secondary mt-1">Versi {process.env.NEXT_PUBLIC_APP_VERSION ?? '1.2.0'}</div>
                  <p className="text-xs text-bark-700 leading-normal mt-2.5">{aboutLang.description}</p>
                </div>
                <div className="bg-surface border border-border rounded-lg mt-3.5 overflow-hidden">
                  {documents.map(d => (
                    <button
                      key={d.slug}
                      type="button"
                      onClick={() => onOpenDoc(d.slug)}
                      className="w-full flex justify-between items-center px-3.5 py-3 border-t border-border first:border-t-0 text-sm font-semibold text-primary text-left hover:bg-muted"
                    >
                      <span>{d.langs[lang]?.title || d.langs.id.title}</span><ChevronRight size={14} className="text-secondary" aria-hidden />
                    </button>
                  ))}
                  <div className="flex justify-between items-center px-3.5 py-3 border-t border-border text-sm font-semibold text-primary">
                    <span>Kunjungi Website</span>
                    <span className="text-secondary font-medium inline-flex items-center gap-0.5">gizku.com <ChevronRight size={14} aria-hidden /></span>
                  </div>
                </div>
                <div className="bg-muted rounded-lg mt-3.5 p-3 text-[11px] text-bark-700 leading-normal">
                  <strong>Disclaimer:</strong> {aboutLang.disclaimer}
                </div>
              </div>
            )}

            {view === 'detail' && previewDoc && (
              <div className="flex-1 overflow-y-auto px-[18px] pb-6">
                <div className="flex items-center gap-2.5 pt-2 pb-3.5">
                  <button type="button" onClick={onBackAbout} aria-label="Kembali" className="w-7 h-7 rounded-sm bg-surface border border-border flex items-center justify-center">
                    <ChevronLeft size={14} aria-hidden />
                  </button>
                  <div className="text-[14.5px] font-bold text-primary">{docLang?.title}</div>
                </div>
                {docBody
                  ? <div className="legal-doc-body text-xs" dangerouslySetInnerHTML={{ __html: docBody }} />
                  : <p className="text-secondary text-xs">Belum tersedia dalam bahasa ini.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
