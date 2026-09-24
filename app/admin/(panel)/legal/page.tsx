'use client'

import { useCallback, useEffect, useState } from 'react'
import RichTextEditor from '@/components/admin/RichTextEditor'

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
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;
    color:#fff;background:${type === 'success' ? '#2ECC71' : '#EF4444'};
    box-shadow:0 4px 16px rgba(0,0,0,0.15);transition:opacity 0.4s;
  `
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400) }, 2600)
}

function slugify(str: string) {
  return (str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'dokumen'
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#111827', background: '#fff',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const cardStyle: React.CSSProperties = { background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 20, boxSizing: 'border-box' }

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
    if (!confirm('Hapus dokumen ini?')) return
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
    if (!confirm('Hapus jenis dokumen ini?')) return
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

  const S: React.CSSProperties = { fontFamily: '\'Plus Jakarta Sans\', system-ui, sans-serif', maxWidth: 1000, margin: '0 auto' }

  if (loading) {
    return <div style={{ ...S, textAlign: 'center', padding: 64, color: '#9CA3AF', fontSize: 14 }}>Memuat…</div>
  }

  return (
    <div style={S}>
      {view === 'list' && (
        <ListView
          documents={documents}
          documentTypes={documentTypes}
          about={about}
          deletingId={deletingId}
          onNewDoc={openNewDoc}
          onEditDoc={openEditDoc}
          onDeleteDoc={deleteDoc}
          onOpenTypesModal={() => setTypesModalOpen(true)}
          onOpenAboutModal={openAboutModal}
          onOpenPreview={openPreview}
        />
      )}

      {view === 'editor' && draft && (
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
          onDelete={() => draft.id && deleteDoc(draft.id)}
          saving={saving}
          deleting={deletingId === draft.id}
        />
      )}

      {typesModalOpen && (
        <TypesModal
          types={documentTypes}
          newName={typesModalNewName}
          setNewName={setTypesModalNewName}
          onAdd={addTypeFromModal}
          onRemove={removeType}
          onClose={() => setTypesModalOpen(false)}
        />
      )}

      {aboutModalOpen && aboutDraft && (
        <AboutModal
          draft={aboutDraft}
          activeLang={aboutActiveLang}
          setActiveLang={setAboutActiveLang}
          setField={setAboutField}
          onSave={saveAboutContent}
          onClose={() => setAboutModalOpen(false)}
          saving={savingAbout}
        />
      )}

      {previewOpen && (
        <PreviewPanel
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
      )}
    </div>
  )
}

/* ─── List View ─────────────────────────────────────────── */
function ListView({
  documents, documentTypes, about, deletingId,
  onNewDoc, onEditDoc, onDeleteDoc, onOpenTypesModal, onOpenAboutModal, onOpenPreview,
}: {
  documents: DocumentRow[]
  documentTypes: DocType[]
  about: AboutState
  deletingId: string | null
  onNewDoc: () => void
  onEditDoc: (d: DocumentRow) => void
  onDeleteDoc: (id: string) => void
  onOpenTypesModal: () => void
  onOpenAboutModal: () => void
  onOpenPreview: () => void
}) {
  const typeLabel = (key: string) => documentTypes.find(t => t.key === key)?.label ?? key

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Dokumen Legal</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, maxWidth: 560, lineHeight: 1.6 }}>
            Kelola dokumen legal (Syarat &amp; Ketentuan, Kebijakan Privasi, dan lainnya). Setiap dokumen yang disimpan langsung terbit dan diambil oleh aplikasi berdasarkan slug-nya.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onOpenPreview} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Preview di Aplikasi
          </button>
          <button onClick={onNewDoc} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Dokumen Baru
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <button onClick={onOpenTypesModal} style={{ background: 'none', border: 'none', color: '#15803D', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          Kelola Jenis Dokumen
        </button>
      </div>

      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: '#F9FAFB', borderRadius: 16, border: '1.5px dashed #E5E7EB' }}>
          <p style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Belum ada dokumen legal</p>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Klik &ldquo;+ Dokumen Baru&rdquo; untuk mulai menambahkan.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 0.9fr 1fr 1.3fr', gap: 12, padding: '12px 20px', background: '#F9FAFB', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>Dokumen</div><div>Bahasa</div><div>Diubah</div><div style={{ textAlign: 'right' }}>Aksi</div>
          </div>
          {documents.map((doc, i) => {
            const hasId = !!doc.langs.id.title
            const hasEn = !!doc.langs.en.title
            return (
              <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '2.4fr 0.9fr 1fr 1.3fr', gap: 12, padding: '16px 20px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{doc.langs.id.title || <em style={{ color: '#9CA3AF', fontStyle: 'normal' }}>(tanpa judul)</em>}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{typeLabel(doc.typeKey)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: hasId ? '#D1FAE5' : '#F3F4F6', color: hasId ? '#15803D' : '#9CA3AF' }}>ID</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: hasEn ? '#D1FAE5' : '#F3F4F6', color: hasEn ? '#15803D' : '#9CA3AF' }}>EN</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#6B7280' }}>{fmtDate(doc.updatedAt)}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button onClick={() => onEditDoc(doc)} style={{ background: 'none', border: 'none', color: '#15803D', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
                  <span style={{ color: '#E5E7EB' }}>&middot;</span>
                  <button onClick={() => onDeleteDoc(doc.id)} disabled={deletingId === doc.id} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {deletingId === doc.id ? '…' : 'Hapus'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={labelStyle}>Konten Halaman Tentang Aplikasi</div>
            <p style={{ margin: '8px 0 0', fontSize: 13.5, color: '#374151', lineHeight: 1.6, maxWidth: 540 }}>{about.id.description || <em style={{ color: '#9CA3AF', fontStyle: 'normal' }}>Belum diisi</em>}</p>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.5, maxWidth: 540 }}><strong style={{ color: '#374151' }}>Disclaimer:</strong> {about.id.disclaimer || '—'}</p>
          </div>
          <button onClick={onOpenAboutModal} style={{ background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Edit Konten
          </button>
        </div>
      </div>
    </>
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
  const tabBase: React.CSSProperties = { flex: 1, textAlign: 'center', padding: '10px 0', cursor: 'pointer', fontSize: 14, fontWeight: 700 }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1.5px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827' }} aria-label="Kembali">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>{draft.id ? 'Edit Dokumen' : 'Dokumen Baru'}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={cardStyle}>
            <label style={labelStyle}>Jenis Dokumen</label>
            <select
              value={draft.typeKey}
              onChange={e => {
                if (e.target.value === '__add_new__') { setAddTypeOpen(true); return }
                setDraftType(e.target.value)
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {documentTypes.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              <option value="__add_new__">+ Tambah jenis baru…</option>
            </select>
            {addTypeOpen && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Nama jenis dokumen baru" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={confirmAddType} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Tambah</button>
                <button onClick={() => { setAddTypeOpen(false); setNewTypeName('') }} style={{ padding: '0 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', margin: '-20px -20px 18px' }}>
              <div onClick={() => setActiveLang('id')} style={{ ...tabBase, borderBottom: activeLang === 'id' ? '2px solid #2ECC71' : '2px solid transparent', color: activeLang === 'id' ? '#15803D' : '#6B7280' }}>Bahasa Indonesia</div>
              <div onClick={() => setActiveLang('en')} style={{ ...tabBase, borderBottom: activeLang === 'en' ? '2px solid #2ECC71' : '2px solid transparent', color: activeLang === 'en' ? '#15803D' : '#6B7280' }}>English</div>
            </div>

            <div style={{ display: activeLang === 'id' ? 'block' : 'none' }}>
              <label style={labelStyle}>Judul</label>
              <input value={draft.langs.id.title} onChange={e => setDraftLang('id', 'title', e.target.value)} placeholder="mis. Syarat & Ketentuan" style={inputStyle} />
              <label style={{ ...labelStyle, marginTop: 16 }}>Isi Dokumen</label>
              <RichTextEditor
                value={draft.langs.id.bodyHtml}
                onChange={html => setDraftLang('id', 'bodyHtml', html)}
                placeholder="Tulis isi dokumen di sini…"
                resetKey={`${draft.id ?? 'new'}-id`}
              />
            </div>

            <div style={{ display: activeLang === 'en' ? 'block' : 'none' }}>
              <label style={labelStyle}>Title</label>
              <input value={draft.langs.en.title} onChange={e => setDraftLang('en', 'title', e.target.value)} placeholder="e.g. Terms & Conditions" style={inputStyle} />
              <label style={{ ...labelStyle, marginTop: 16 }}>Document Content</label>
              <RichTextEditor
                value={draft.langs.en.bodyHtml}
                onChange={html => setDraftLang('en', 'bodyHtml', html)}
                placeholder="Write document content here…"
                resetKey={`${draft.id ?? 'new'}-en`}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <label style={labelStyle}>Slug</label>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#6B7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              /{slugPreview}
            </div>
          </div>

          {draft.id && (
            <button onClick={onDelete} disabled={deleting} style={{ background: '#fff', color: '#EF4444', border: '1.5px solid #EF4444', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {deleting ? 'Menghapus…' : 'Hapus Dokumen'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
        <button onClick={onBack} style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
        <button onClick={onSave} disabled={saving} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: saving ? '#9CA3AF' : '#111827', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Menyimpan…' : 'Simpan Dokumen'}
        </button>
      </div>
    </div>
  )
}

/* ─── Document Types Modal ──────────────────────────────── */
function TypesModal({
  types, newName, setNewName, onAdd, onRemove, onClose,
}: {
  types: DocType[]
  newName: string
  setNewName: (v: string) => void
  onAdd: () => void
  onRemove: (key: string) => void
  onClose: () => void
}) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column', padding: 22, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>Kelola Jenis Dokumen</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>&times;</button>
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {types.map(t => (
            <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{t.usedCount} dokumen &middot; {t.builtin ? 'bawaan sistem' : 'kustom'}</div>
              </div>
              {!t.builtin && t.usedCount === 0 && (
                <button onClick={() => onRemove(t.key)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hapus</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama jenis baru" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={onAdd} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Tambah</button>
        </div>
      </div>
    </div>
  )
}

/* ─── About Content Modal ───────────────────────────────── */
function AboutModal({
  draft, activeLang, setActiveLang, setField, onSave, onClose, saving,
}: {
  draft: AboutState
  activeLang: 'id' | 'en'
  setActiveLang: (l: 'id' | 'en') => void
  setField: (lang: 'id' | 'en', field: 'description' | 'disclaimer', value: string) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}) {
  const tabBase: React.CSSProperties = { flex: 1, textAlign: 'center', padding: '10px 0', cursor: 'pointer', fontSize: 13.5, fontWeight: 700 }
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 22, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>Konten Halaman Tentang Aplikasi</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>&times;</button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 16 }}>
          <div onClick={() => setActiveLang('id')} style={{ ...tabBase, borderBottom: activeLang === 'id' ? '2px solid #2ECC71' : '2px solid transparent', color: activeLang === 'id' ? '#15803D' : '#6B7280' }}>Bahasa Indonesia</div>
          <div onClick={() => setActiveLang('en')} style={{ ...tabBase, borderBottom: activeLang === 'en' ? '2px solid #2ECC71' : '2px solid transparent', color: activeLang === 'en' ? '#15803D' : '#6B7280' }}>English</div>
        </div>

        <div style={{ display: activeLang === 'id' ? 'block' : 'none' }}>
          <label style={labelStyle}>Deskripsi Aplikasi</label>
          <textarea value={draft.id.description} onChange={e => setField('id', 'description', e.target.value)} rows={3} style={textareaStyle} />
          <label style={{ ...labelStyle, marginTop: 14 }}>Disclaimer</label>
          <textarea value={draft.id.disclaimer} onChange={e => setField('id', 'disclaimer', e.target.value)} rows={4} style={textareaStyle} />
        </div>
        <div style={{ display: activeLang === 'en' ? 'block' : 'none' }}>
          <label style={labelStyle}>App Description</label>
          <textarea value={draft.en.description} onChange={e => setField('en', 'description', e.target.value)} rows={3} style={textareaStyle} />
          <label style={{ ...labelStyle, marginTop: 14 }}>Disclaimer</label>
          <textarea value={draft.en.disclaimer} onChange={e => setField('en', 'disclaimer', e.target.value)} rows={4} style={textareaStyle} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: saving ? '#9CA3AF' : '#111827', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Preview Panel ─────────────────────────────────────── */
function PreviewPanel({
  about, documents, lang, setLang, view, previewDoc, onOpenDoc, onBackAbout, onClose,
}: {
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
  const pillBase: React.CSSProperties = { padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid #E5E7EB' }
  const aboutLang = about[lang] ?? about.id
  const docLang = previewDoc ? (previewDoc.langs[lang]?.title ? previewDoc.langs[lang] : previewDoc.langs.id) : null
  const docBody = previewDoc?.langs[lang]?.bodyHtml

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 380, maxWidth: '100vw', background: '#F9FAFB', boxShadow: '-8px 0 24px rgba(17,24,39,0.18)', zIndex: 41, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Preview — Tentang Aplikasi</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>&times;</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '14px 20px 0', flexShrink: 0 }}>
          <button onClick={() => setLang('id')} style={{ ...pillBase, background: lang === 'id' ? '#2ECC71' : '#fff', color: lang === 'id' ? '#fff' : '#374151', borderColor: lang === 'id' ? '#2ECC71' : '#E5E7EB' }}>ID</button>
          <button onClick={() => setLang('en')} style={{ ...pillBase, background: lang === 'en' ? '#2ECC71' : '#fff', color: lang === 'en' ? '#fff' : '#374151', borderColor: lang === 'en' ? '#2ECC71' : '#E5E7EB' }}>EN</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 300, background: '#F9FAFB', border: '8px solid #111827', borderRadius: 36, overflow: 'hidden', boxShadow: '0 12px 30px rgba(17,24,39,.25)', display: 'flex', flexDirection: 'column', height: 620, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px 4px', fontSize: 12, fontWeight: 700, color: '#111827', flexShrink: 0 }}>
              <span>9:41</span><span>&#9679;&#9679;&#9679;</span>
            </div>

            {view === 'about' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 24px' }}>
                <div style={{ textAlign: 'center', padding: '16px 0 10px' }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: '#111827' }}>Gizku</div>
                  <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 4 }}>Versi 1.0.0</div>
                  <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, margin: '10px 0 0' }}>{aboutLang.description}</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, marginTop: 14, overflow: 'hidden' }}>
                  {documents.map(d => (
                    <div key={d.slug} onClick={() => onOpenDoc(d.slug)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderTop: '1px solid #F3F4F6', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#111827' }}>
                      <span>{(d.langs[lang]?.title || d.langs.id.title)}</span><span style={{ color: '#D1D5DB' }}>&rsaquo;</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderTop: '1px solid #F3F4F6', fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    <span>Kunjungi Website</span>
                    <span style={{ color: '#6B7280', fontWeight: 500 }}>gizku.com &rsaquo;</span>
                  </div>
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: 14, marginTop: 14, padding: 13, fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                  <strong>Disclaimer:</strong> {aboutLang.disclaimer}
                </div>
              </div>
            )}

            {view === 'detail' && previewDoc && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 14px' }}>
                  <div onClick={onBackAbout} style={{ cursor: 'pointer', width: 28, height: 28, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 5l-7 7 7 7" /></svg>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{docLang?.title}</div>
                </div>
                {docBody
                  ? <div style={{ fontSize: 12, color: '#374151' }} dangerouslySetInnerHTML={{ __html: docBody }} />
                  : <p style={{ color: '#9CA3AF', fontSize: 12 }}>Belum tersedia dalam bahasa ini.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
