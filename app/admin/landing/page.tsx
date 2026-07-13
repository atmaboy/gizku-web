'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

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

const SECTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  hero:         { label: 'Hero',        color: '#6366F1', bg: '#EEF2FF' },
  how_it_works: { label: 'Cara Kerja',  color: '#0EA5E9', bg: '#E0F2FE' },
  features:     { label: 'Fitur',       color: '#10B981', bg: '#D1FAE5' },
  stats:        { label: 'Statistik',   color: '#F59E0B', bg: '#FEF3C7' },
  cta:          { label: 'CTA',         color: '#EF4444', bg: '#FEE2E2' },
  blog_post:    { label: 'Blog Post',   color: '#8B5CF6', bg: '#EDE9FE' },
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  ),
  how_it_works: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  features: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  stats: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  cta: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  blog_post: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
}

const SECTIONS       = Object.keys(SECTION_LABELS)
const CTA_SECTIONS   = ['hero', 'cta']
const HERO_SECTIONS  = ['hero']
const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB    = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

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
  if (!s) return <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-md font-medium">{section}</span>
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span style={{ color: s.color }}>{SECTION_ICONS[section]}</span>
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: FieldLabel
// ─────────────────────────────────────────────────────────────────────────────
function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-semibold text-[#374151] mb-1.5">
      {children}
      {hint && <span className="font-normal text-[#9CA3AF] ml-1">— {hint}</span>}
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: HeroImageUploader
// Drag-and-drop / file-picker yang upload langsung ke Supabase Storage
// via POST /api/admin/upload-image
// ─────────────────────────────────────────────────────────────────────────────
type UploadState =
  | { status: 'idle' }
  | { status: 'dragover' }
  | { status: 'uploading'; progress: number; filename: string }
  | { status: 'success'; url: string }
  | { status: 'error'; message: string }

function HeroImageUploader({
  currentUrl,
  onUploaded,
  onRemove,
}: {
  currentUrl: string
  onUploaded: (url: string) => void
  onRemove: () => void
}) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [manualUrl, setManualUrl]     = useState(currentUrl)
  const [previewErr, setPreviewErr]   = useState(false)
  const [showManual, setShowManual]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync manualUrl bila currentUrl berubah dari luar (e.g. edit row berbeda)
  useEffect(() => {
    setManualUrl(currentUrl)
    setPreviewErr(false)
    if (currentUrl && uploadState.status !== 'uploading') {
      setUploadState({ status: 'success', url: currentUrl })
    } else if (!currentUrl) {
      setUploadState({ status: 'idle' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl])

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipe file tidak didukung (${file.type}). Gunakan JPEG, PNG, WebP, atau GIF.`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maks ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  async function uploadFile(file: File) {
    const err = validateFile(file)
    if (err) { setUploadState({ status: 'error', message: err }); return }

    setUploadState({ status: 'uploading', progress: 0, filename: file.name })

    // Simulate granular progress via XHR (fetch tidak expose upload progress)
    const form = new FormData()
    form.append('file', file)
    if (currentUrl) form.append('oldUrl', currentUrl)

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/upload-image')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90) // cap at 90% until response
          setUploadState({ status: 'uploading', progress: pct, filename: file.name })
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText) as { url?: string; error?: string }
            if (json.url) {
              setUploadState({ status: 'success', url: json.url })
              setManualUrl(json.url)
              setPreviewErr(false)
              onUploaded(json.url)
            } else {
              setUploadState({ status: 'error', message: json.error ?? 'Upload gagal' })
            }
          } catch {
            setUploadState({ status: 'error', message: 'Respons server tidak valid' })
          }
        } else {
          try {
            const json = JSON.parse(xhr.responseText) as { error?: string }
            setUploadState({ status: 'error', message: json.error ?? `Server error ${xhr.status}` })
          } catch {
            setUploadState({ status: 'error', message: `Server error ${xhr.status}` })
          }
        }
        resolve()
      }

      xhr.onerror = () => {
        setUploadState({ status: 'error', message: 'Koneksi gagal. Periksa jaringan Anda.' })
        resolve()
      }

      xhr.send(form)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setUploadState({ status: 'idle' })
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    // Reset input sehingga file yang sama bisa dipilih ulang
    e.target.value = ''
  }

  function handleManualSave() {
    const url = manualUrl.trim()
    if (url) {
      onUploaded(url)
      setUploadState({ status: 'success', url })
      setPreviewErr(false)
    } else {
      handleRemove()
    }
    setShowManual(false)
  }

  function handleRemove() {
    setUploadState({ status: 'idle' })
    setManualUrl('')
    setPreviewErr(false)
    setShowManual(false)
    onRemove()
  }

  const isDragover   = uploadState.status === 'dragover'
  const isUploading  = uploadState.status === 'uploading'
  const isSuccess    = uploadState.status === 'success'
  const isError      = uploadState.status === 'error'
  const displayUrl   = isSuccess ? uploadState.url : currentUrl

  return (
    <div className="space-y-3">

      {/* ── State: sukses / ada gambar ── */}
      {isSuccess && displayUrl && (
        <div className="rounded-xl border border-[#C7D2FE] overflow-hidden" style={{ background: '#F8F9FF' }}>
          {/* Thumbnail */}
          <div className="relative flex items-center justify-center bg-[#EEF2FF] min-h-[120px] p-3">
            {!previewErr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt="Preview gambar hero"
                className="max-h-52 rounded-lg object-contain shadow-md"
                style={{ maxWidth: '100%' }}
                onError={() => setPreviewErr(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-[#9CA3AF]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                  <line x1="4" y1="4" x2="20" y2="20"/>
                </svg>
                <p className="text-xs text-red-400 font-medium">Gambar tidak dapat dimuat</p>
              </div>
            )}

            {/* Badge: Supabase */}
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#4338CA] bg-white px-2 py-1 rounded-full shadow-sm border border-[#E0E7FF]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Tersimpan di Supabase
            </span>
          </div>

          {/* URL bar + aksi */}
          <div className="px-3 py-2.5 flex items-center gap-2 border-t border-[#E0E7FF]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="text-[10px] text-[#6B7280] font-mono truncate flex-1">{displayUrl}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => { setShowManual(v => !v); setManualUrl(displayUrl) }}
                className="text-[10px] px-2 py-1 rounded-lg border border-[#E0E7FF] text-[#6366F1] hover:bg-[#EEF2FF] transition-colors font-medium min-h-[28px]"
                title="Edit URL manual"
              >
                Edit URL
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[10px] px-2 py-1 rounded-lg border border-[#E0E7FF] text-[#6366F1] hover:bg-[#EEF2FF] transition-colors font-medium min-h-[28px]"
                title="Ganti gambar"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-[10px] px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors font-medium min-h-[28px]"
                title="Hapus gambar"
              >
                Hapus
              </button>
            </div>
          </div>

          {/* Inline edit URL manual */}
          {showManual && (
            <div className="px-3 pb-3 space-y-2 border-t border-[#E0E7FF] pt-2.5" style={{ background: '#fff' }}>
              <p className="text-[10px] text-[#9CA3AF]">Atau tempel URL gambar langsung (harus bisa diakses publik):</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 border border-[#E0E7FF] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent min-h-[36px]"
                  style={{ fontSize: '14px' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleManualSave() }}
                />
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="px-3 py-2 text-xs rounded-lg font-semibold text-white min-h-[36px]"
                  style={{ background: '#6366F1' }}
                >
                  Simpan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── State: uploading ── */}
      {isUploading && (
        <div className="rounded-xl border border-[#C7D2FE] p-4 space-y-3" style={{ background: '#F8F9FF' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#3730A3] truncate">{uploadState.filename}</p>
              <p className="text-[10px] text-[#818CF8]">Mengunggah ke Supabase Storage…</p>
            </div>
            <span className="text-sm font-bold tabular-nums text-[#6366F1]">{uploadState.progress}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#E0E7FF' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%`, background: 'linear-gradient(90deg, #6366F1, #818CF8)' }}
            />
          </div>
        </div>
      )}

      {/* ── State: error ── */}
      {isError && (
        <div className="rounded-xl border border-red-200 p-3 flex items-start gap-3" style={{ background: '#FFF5F5' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FEE2E2' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 mb-0.5">Upload gagal</p>
            <p className="text-[11px] text-red-500">{uploadState.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadState({ status: 'idle' })}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-100 transition-colors font-medium min-h-[28px]"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* ── State: idle / drop zone ── */}
      {!isSuccess && !isUploading && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Area upload gambar, klik atau seret file ke sini"
          className="rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-7 px-4 text-center focus-visible:outline-2 focus-visible:outline-[#6366F1]"
          style={{
            borderColor: isDragover ? '#6366F1' : '#C7D2FE',
            background:  isDragover ? '#EEF2FF' : '#F8F9FF',
            transform:   isDragover ? 'scale(1.01)' : 'scale(1)',
          }}
          onDragOver={e => { e.preventDefault(); setUploadState({ status: 'dragover' }) }}
          onDragLeave={() => setUploadState({ status: 'idle' }) }
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
            style={{ background: isDragover ? '#C7D2FE' : '#E0E7FF' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDragover ? '#4338CA' : '#818CF8'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: isDragover ? '#4338CA' : '#3730A3' }}>
              {isDragover ? 'Lepaskan untuk upload' : 'Seret gambar ke sini'}
            </p>
            <p className="text-xs text-[#818CF8] mt-0.5">
              atau <span className="underline font-semibold">klik untuk memilih file</span>
            </p>
            <p className="text-[10px] text-[#A5B4FC] mt-1.5">
              PNG, JPG, WebP, GIF · Maks {MAX_SIZE_MB} MB · Upload ke Supabase Storage
            </p>
          </div>
        </div>
      )}

      {/* Manual URL fallback (idle state) */}
      {!isSuccess && !isUploading && (
        <div>
          <button
            type="button"
            onClick={() => setShowManual(v => !v)}
            className="text-[11px] text-[#818CF8] hover:text-[#6366F1] transition-colors underline"
          >
            {showManual ? '↑ Sembunyikan' : '↓ Atau tempel URL gambar langsung'}
          </button>
          {showManual && (
            <div className="mt-2 flex gap-2" style={{ animation: 'slideUp 0.15s ease' }}>
              <input
                type="url"
                value={manualUrl}
                onChange={e => setManualUrl(e.target.value)}
                placeholder="https://example.com/screenshot-app.png"
                className="flex-1 border border-[#E0E7FF] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent min-h-[40px]"
                style={{ background: '#fff', fontSize: '14px' }}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSave() }}
              />
              <button
                type="button"
                onClick={handleManualSave}
                disabled={!manualUrl.trim()}
                className="px-3 py-2 text-xs rounded-lg font-semibold text-white disabled:opacity-40 min-h-[40px]"
                style={{ background: '#6366F1' }}
              >
                Pakai URL ini
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </div>
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
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [jsonErr, setJsonErr]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
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

  useEffect(() => {
    if (showForm || deleteConfirm !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showForm, deleteConfirm])

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

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className="fixed z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white shadow-lg"
          style={{
            background: toast.type === 'ok' ? '#059669' : '#DC2626',
            animation: 'slideInRight 0.25s ease',
            top: 16, right: 16, left: 16, maxWidth: 360, marginInline: 'auto',
          }}
        >
          {toast.type === 'ok'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          <span className="flex-1">{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Page Header */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#D4F5E4' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F9D57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            </div>
            <h1 className="text-xl sm:text-[22px] font-bold text-[#111827] tracking-tight">Landing Page Editor</h1>
          </div>
          <p className="text-sm text-[#6B7280] ml-10">Kelola konten yang tampil di halaman utama Gizku.</p>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <a
            href="/" target="_blank" rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-sm px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] min-h-[44px]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Preview
          </a>
          <button
            onClick={openNew}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-semibold text-white shadow-[0_1px_4px_rgba(46,204,113,0.35)] hover:opacity-90 active:opacity-80 transition-opacity min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #2ECC71, #1FA85E)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Konten
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SECTIONS.map(s => {
          const info  = SECTION_LABELS[s]
          const count = sectionCounts[s] ?? 0
          return (
            <button
              key={s}
              onClick={() => setFilterSection(filterSection === s ? 'all' : s)}
              className="rounded-xl p-3 text-left transition-all border min-h-[64px]"
              style={{
                background:  filterSection === s ? info.bg : '#fff',
                borderColor: filterSection === s ? info.color + '40' : '#E5E7EB',
                boxShadow:   filterSection === s ? `0 0 0 1px ${info.color}30` : '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: info.color }}>{SECTION_ICONS[s]}</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: filterSection === s ? info.color : '#111827' }}>{count}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-[#6B7280] leading-tight">{info.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#9CA3AF] font-medium mr-1">Filter:</span>
        {['all', ...SECTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilterSection(s)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all min-h-[32px]"
            style={{
              background: filterSection === s ? (s === 'all' ? '#111827' : SECTION_LABELS[s]?.color) : '#F3F4F6',
              color: filterSection === s ? '#fff' : '#6B7280',
              boxShadow: filterSection === s ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {s === 'all' ? `Semua (${rows.length})` : `${SECTION_LABELS[s]?.label} (${sectionCounts[s] ?? 0})`}
          </button>
        ))}
        {filterSection !== 'all' && (
          <button onClick={() => setFilterSection('all')} className="text-xs text-[#9CA3AF] hover:text-[#374151] ml-1 underline transition-colors">
            Reset
          </button>
        )}
      </div>

      {/* Content list */}
      <div className="bg-white ring-1 ring-[#E5E7EB] rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(16,24,40,0.06)]">

        {loading && (
          <div className="p-6 space-y-3 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <div className="h-6 w-16 bg-[#F3F4F6] rounded-md shrink-0"/>
                <div className="h-5 w-20 bg-[#F3F4F6] rounded-md"/>
                <div className="h-5 flex-1 bg-[#F3F4F6] rounded-md"/>
                <div className="h-8 w-16 bg-[#F3F4F6] rounded-lg"/>
              </div>
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="py-16 text-center" style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F3F4F6' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            </div>
            <p className="text-[#374151] font-semibold text-sm mb-1">
              {filterSection === 'all' ? 'Belum ada konten' : `Belum ada konten ${SECTION_LABELS[filterSection]?.label}`}
            </p>
            <p className="text-[#9CA3AF] text-xs mb-4">Klik tombol &quot;Tambah Konten&quot; untuk mulai menambahkan.</p>
            <button onClick={openNew} className="text-sm px-4 py-2.5 rounded-xl font-semibold text-white min-h-[44px]" style={{ background: '#2ECC71' }}>
              + Tambah Konten
            </button>
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]" style={{ background: '#F9FAFB' }}>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Section</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Slug</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Title / Subtitle</th>
                    <th className="text-center px-5 py-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Urutan</th>
                    <th className="text-center px-5 py-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((row, i) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors group"
                      style={{ animation: `slideUp ${0.1 + i * 0.04}s ease both` }}
                    >
                      <td className="px-5 py-3.5"><SectionBadge section={row.section} /></td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">{row.slug}</span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <p className="font-medium text-[#111827] text-sm truncate">{row.title}</p>
                        {row.subtitle && <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{row.subtitle}</p>}
                        {row.section === 'hero' && typeof row.meta?.hero_image_url === 'string' && row.meta.hero_image_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#6366F1] bg-[#EEF2FF] px-1.5 py-0.5 rounded mt-1 font-medium">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            Custom Image
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs font-semibold tabular-nums text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">{row.sortOrder}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggle(row)}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
                          style={{
                            background: row.isActive ? '#D1FAE5' : '#F3F4F6',
                            color:      row.isActive ? '#059669' : '#9CA3AF',
                          }}
                          title={row.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.isActive ? '#10B981' : '#D1D5DB' }} />
                          {row.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F3F4F6] transition-colors font-medium"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(row.id)}
                            disabled={deleting === row.id}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors font-medium disabled:opacity-40"
                          >
                            {deleting === row.id
                              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            }
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="sm:hidden divide-y divide-[#F3F4F6]">
              {displayed.map((row, i) => (
                <li key={row.id} className="p-4 space-y-3" style={{ animation: `slideUp ${0.1 + i * 0.04}s ease both` }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SectionBadge section={row.section} />
                    <span className="font-mono text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">{row.slug}</span>
                    <span className="ml-auto text-xs font-semibold tabular-nums text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded">#{row.sortOrder}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#111827] leading-snug">{row.title}</p>
                    {row.subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-2">{row.subtitle}</p>}
                    {row.section === 'hero' && typeof row.meta?.hero_image_url === 'string' && row.meta.hero_image_url && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#6366F1] bg-[#EEF2FF] px-1.5 py-0.5 rounded mt-1 font-medium">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Custom Image
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(row)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-semibold transition-all min-h-[36px]"
                      style={{ background: row.isActive ? '#D1FAE5' : '#F3F4F6', color: row.isActive ? '#059669' : '#9CA3AF' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.isActive ? '#10B981' : '#D1D5DB' }} />
                      {row.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors font-medium min-h-[44px]"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(row.id)}
                        disabled={deleting === row.id}
                        aria-label="Hapus konten"
                        className="inline-flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-xl border border-red-100 text-red-400 bg-white hover:bg-red-50 active:bg-red-100 hover:text-red-600 hover:border-red-200 transition-colors font-medium disabled:opacity-40 min-h-[44px] min-w-[44px]"
                      >
                        {deleting === row.id
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        }
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirm !== null && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}
        >
          <div className="bg-white w-full rounded-2xl p-6 shadow-2xl" style={{ maxWidth: 400, animation: 'slideUp 0.2s ease' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FEE2E2' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </div>
            <h3 className="text-center font-bold text-[#111827] text-base mb-2">Hapus konten ini?</h3>
            <p className="text-center text-sm text-[#6B7280] mb-6">Tindakan ini tidak bisa dibatalkan. Konten akan dihapus permanen dari database.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-sm rounded-xl border border-[#E5E7EB] text-[#374151] font-medium hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors min-h-[48px]">Batal</button>
              <button onClick={() => confirmDelete(deleteConfirm)} disabled={deleting !== null} className="flex-1 py-3 text-sm rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors disabled:opacity-60 min-h-[48px]">
                {deleting !== null ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {showForm && editRow && (
        <div
          className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div
            className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ maxWidth: 640, maxHeight: '95dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'slideUp 0.25s ease' }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#F3F4F6] bg-white z-10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: editRow.id ? '#EEF2FF' : '#D4F5E4' }}>
                  {editRow.id
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1F9D57" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  }
                </div>
                <h2 className="text-base font-bold text-[#111827] truncate">
                  {editRow.id ? 'Edit Konten' : 'Tambah Konten Baru'}
                </h2>
              </div>
              <button
                onClick={closeForm}
                aria-label="Tutup"
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5 space-y-5">

              {/* Section + Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Section <span className="text-red-400">*</span></FieldLabel>
                  <select
                    value={editRow.section}
                    onChange={e => updateField('section', e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-3 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                    style={{ fontSize: '16px' }}
                  >
                    {SECTIONS.map(s => <option key={s} value={s}>{SECTION_LABELS[s]?.label}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel hint="URL-friendly">Slug <span className="text-red-400">*</span></FieldLabel>
                  <input
                    type="text"
                    value={editRow.slug ?? ''}
                    onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="contoh: hero-main"
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-3 text-sm text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <FieldLabel>Title <span className="text-red-400">*</span></FieldLabel>
                <input
                  type="text"
                  value={editRow.title ?? ''}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="Judul konten yang tampil di halaman"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Subtitle */}
              <div>
                <FieldLabel hint="opsional">Subtitle / Deskripsi</FieldLabel>
                <input
                  type="text"
                  value={editRow.subtitle ?? ''}
                  onChange={e => updateField('subtitle', e.target.value)}
                  placeholder="Deskripsi pendek di bawah judul"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Body */}
              <div>
                <FieldLabel hint="untuk deskripsi panjang / blog post">Body</FieldLabel>
                <textarea
                  rows={4}
                  value={editRow.body ?? ''}
                  onChange={e => updateField('body', e.target.value)}
                  placeholder="Konten panjang..."
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent resize-y transition-shadow"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* ── HERO IMAGE UPLOADER ── hanya muncul untuk section Hero */}
              {isHeroSection && (
                <div className="rounded-2xl overflow-hidden border border-[#E0E7FF]">
                  {/* Panel header */}
                  <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#EEF2FF' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#C7D2FE' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4338CA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#3730A3]">Gambar Screenshot App (Hero)</span>
                    <span className="ml-auto text-[10px] text-[#818CF8] bg-[#E0E7FF] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Opsional</span>
                  </div>

                  {/* Uploader component */}
                  <div className="px-4 py-4" style={{ background: '#F8F9FF' }}>
                    <HeroImageUploader
                      currentUrl={editRow.heroImageUrl}
                      onUploaded={(url) => updateField('heroImageUrl', url)}
                      onRemove={() => updateField('heroImageUrl', '')}
                    />
                    <p className="text-[10px] text-[#A5B4FC] mt-3">
                      Kosongkan untuk menggunakan ilustrasi SVG default (phone mockup).
                    </p>
                  </div>
                </div>
              )}

              {/* CTA Dedicated Fields */}
              {isCTASection && (
                <div className="rounded-2xl overflow-hidden border border-[#D1FAE5]">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#F0FDF4' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#065F46]">Konfigurasi Tombol CTA</span>
                    <span className="ml-auto text-[10px] text-[#6EE7B7] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                      {editRow.section === 'hero' ? 'Hero' : 'CTA Bottom'}
                    </span>
                  </div>

                  <div className="px-4 py-4 space-y-4" style={{ background: '#FAFFFE' }}>
                    <div>
                      <FieldLabel>Label Tombol</FieldLabel>
                      <input
                        type="text"
                        value={editRow.ctaLabel}
                        onChange={e => updateField('ctaLabel', e.target.value)}
                        placeholder="Mulai Sekarang"
                        className="w-full border border-[#D1FAE5] rounded-xl px-3 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                        style={{ background: '#fff', fontSize: '16px' }}
                      />
                      <p className="text-[11px] text-[#9CA3AF] mt-1">Teks yang tampil di dalam tombol hijau besar</p>
                    </div>

                    <div>
                      <FieldLabel hint="opsional">Catatan di bawah tombol</FieldLabel>
                      <input
                        type="text"
                        value={editRow.ctaNote}
                        onChange={e => updateField('ctaNote', e.target.value)}
                        placeholder="Gratis · Tidak perlu kartu kredit"
                        className="w-full border border-[#D1FAE5] rounded-xl px-3 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                        style={{ background: '#fff', fontSize: '16px' }}
                      />
                      <p className="text-[11px] text-[#9CA3AF] mt-1">Teks kecil abu-abu di bawah tombol</p>
                    </div>

                    <div>
                      <FieldLabel hint="1 item per baris">Checklist Keunggulan</FieldLabel>
                      <textarea
                        rows={4}
                        value={editRow.benefitList}
                        onChange={e => updateField('benefitList', e.target.value)}
                        placeholder={"Gratis selamanya\nTanpa kartu kredit\nLangsung bisa dipakai"}
                        className="w-full border border-[#D1FAE5] rounded-xl px-3 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent resize-y transition-shadow"
                        style={{ background: '#fff', fontSize: '16px' }}
                      />
                      <p className="text-[11px] text-[#9CA3AF] mt-1">
                        Daftar item dengan centang hijau ✓ di bawah deskripsi. Satu item per baris.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>URL — Belum Login</FieldLabel>
                        <input
                          type="text"
                          value={editRow.ctaUrlGuest}
                          onChange={e => updateField('ctaUrlGuest', e.target.value)}
                          placeholder="/login"
                          className="w-full border border-[#D1FAE5] rounded-xl px-3 py-3 text-sm text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                          style={{ background: '#fff', fontSize: '16px' }}
                        />
                        <p className="text-[10px] text-[#9CA3AF] mt-1">Redirect untuk pengunjung belum login</p>
                      </div>
                      <div>
                        <FieldLabel>URL — Sudah Login</FieldLabel>
                        <input
                          type="text"
                          value={editRow.ctaUrlAuth}
                          onChange={e => updateField('ctaUrlAuth', e.target.value)}
                          placeholder="/main/riwayat"
                          className="w-full border border-[#D1FAE5] rounded-xl px-3 py-3 text-sm text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-shadow min-h-[44px]"
                          style={{ background: '#fff', fontSize: '16px' }}
                        />
                        <p className="text-[10px] text-[#9CA3AF] mt-1">Redirect untuk user sudah login</p>
                      </div>
                    </div>

                    {/* Live preview */}
                    <div className="rounded-xl border border-[#E5E7EB] p-3" style={{ background: '#fff' }}>
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Preview</p>
                      <div className="flex flex-col items-center gap-2">
                        {editRow.benefitList && editRow.benefitList.trim() && (
                          <div className="flex flex-col items-start gap-1 w-full px-2">
                            {editRow.benefitList.split('\n').map((s: string) => s.trim()).filter(Boolean).map((item: string) => (
                              <div key={item} className="flex items-center gap-1.5 text-xs text-[#374151]">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          tabIndex={-1}
                          className="pointer-events-none px-8 py-3 rounded-full text-white text-sm font-bold"
                          style={{ background: '#2ECC71', boxShadow: '0 4px 16px rgba(46,204,113,0.35)' }}
                        >
                          {editRow.ctaLabel || 'Mulai Sekarang'}
                        </button>
                        {editRow.ctaNote && (
                          <p className="text-xs text-[#9CA3AF] text-center">{editRow.ctaNote}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta JSON */}
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                  <label className="text-xs font-semibold text-[#374151]">
                    Meta (JSON)
                    {(isCTASection || isHeroSection) && <span className="font-normal text-[#9CA3AF] ml-1">— otomatis dari field di atas</span>}
                  </label>
                  <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded font-mono">
                    {isHeroSection ? 'hero_image_url, cta_label…' : isCTASection ? 'cta_label, benefit_list…' : 'icon, step, image_url…'}
                  </span>
                </div>
                <textarea
                  rows={(isCTASection || isHeroSection) ? 3 : 5}
                  value={(isCTASection || isHeroSection) ? syncMetaFields(editRow) : (editRow.metaRaw ?? '{}')}
                  onChange={e => {
                    if (isCTASection || isHeroSection) return
                    updateField('metaRaw', e.target.value)
                    setJsonErr('')
                  }}
                  readOnly={isCTASection || isHeroSection}
                  className="w-full border rounded-xl px-3 py-2.5 text-xs font-mono text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent resize-y transition-shadow"
                  style={{
                    borderColor: jsonErr ? '#FCA5A5' : '#E5E7EB',
                    background:  (isCTASection || isHeroSection) ? '#F9FAFB' : (jsonErr ? '#FFF5F5' : '#FAFAFA'),
                    cursor:      (isCTASection || isHeroSection) ? 'default' : 'text',
                    color:       (isCTASection || isHeroSection) ? '#9CA3AF' : '#374151',
                    fontSize:    '13px',
                  }}
                />
                {jsonErr && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {jsonErr}
                  </p>
                )}
              </div>

              {/* Sort Order + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div>
                  <FieldLabel>Sort Order</FieldLabel>
                  <input
                    type="number"
                    value={editRow.sortOrder ?? 0}
                    onChange={e => updateField('sortOrder', parseInt(e.target.value) || 0)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-3 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent min-h-[44px]"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-[11px] text-[#9CA3AF] mt-1">Angka kecil = tampil lebih awal</p>
                </div>
                <div className="flex items-center sm:items-end">
                  <div className="w-full">
                    <FieldLabel>Status Konten</FieldLabel>
                    <label className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
                      <div
                        onClick={() => updateField('isActive', !editRow.isActive)}
                        className="relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0"
                        style={{ background: editRow.isActive ? '#2ECC71' : '#D1D5DB' }}
                        role="switch"
                        aria-checked={editRow.isActive}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          style={{ transform: editRow.isActive ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[#374151]">{editRow.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        <p className="text-[11px] text-[#9CA3AF]">Konten {editRow.isActive ? 'akan tampil' : 'disembunyikan'}</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-[#F3F4F6] bg-white shrink-0">
              <button onClick={closeForm} className="flex-1 py-3 text-sm rounded-xl border border-[#E5E7EB] text-[#374151] font-medium hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors min-h-[48px]">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] px-6 py-3 text-sm rounded-xl font-semibold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, #2ECC71, #1FA85E)' }}
              >
                {saving
                  ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Menyimpan...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{editRow.id ? 'Simpan Perubahan' : 'Tambah Konten'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
