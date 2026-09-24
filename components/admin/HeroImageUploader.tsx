'use client'
/**
 * HeroImageUploader — drag-and-drop / file-picker yang upload langsung ke
 * Supabase Storage via POST /api/admin/upload-image (dipakai Landing Editor
 * untuk gambar screenshot app di section Hero).
 */
import { useEffect, useRef, useState } from 'react'
import { AlertOctagon, Check, ImageOff, Link2, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { Button, Input, Progress } from '@/components/admin/ui'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB    = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

type UploadState =
  | { status: 'idle' }
  | { status: 'dragover' }
  | { status: 'uploading'; progress: number; filename: string }
  | { status: 'success'; url: string }
  | { status: 'error'; message: string }

export default function HeroImageUploader({
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


  const fileName = displayUrl ? decodeURIComponent(displayUrl.split('/').pop()?.split('?')[0] ?? '') : ''

  const manualEditor = (label: string, submitLabel: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="hero-manual-url" className="text-sm text-secondary">{label}</label>
      <div className="flex gap-2">
        <Input
          id="hero-manual-url"
          type="url"
          value={manualUrl}
          onChange={e => setManualUrl(e.target.value)}
          placeholder="https://example.com/screenshot-app.png"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManualSave() } }}
        />
        <Button onClick={handleManualSave} disabled={!manualUrl.trim() && !isSuccess} className="shrink-0">{submitLabel}</Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* ── State: sukses / ada gambar ── */}
      {isSuccess && displayUrl && (
        <div className="rounded-md border border-border overflow-hidden bg-surface">
          <div className="flex items-center gap-3 p-3 max-sm:flex-col max-sm:items-stretch">
            <div className="w-[120px] h-[90px] max-sm:w-full max-sm:h-40 rounded-sm bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
              {!previewErr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayUrl} alt="Preview gambar hero" className="max-w-full max-h-full object-contain" onError={() => setPreviewErr(true)} />
              ) : (
                <span className="flex flex-col items-center gap-1 text-rose-600 text-xs font-medium"><ImageOff size={22} aria-hidden />Gambar tidak dapat dimuat</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-primary truncate">{fileName || 'Gambar hero'}</p>
              <p className="text-xs text-secondary font-mono truncate mt-0.5" title={displayUrl}>{displayUrl}</p>
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 mt-1.5"><Check size={12} aria-hidden />Tersimpan di Supabase</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-3 py-2.5 bg-sunken border-t border-border">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Ganti</Button>
            <Button variant="outline" size="sm" icon={Link2} onClick={() => { setShowManual(v => !v); setManualUrl(displayUrl) }} aria-expanded={showManual}>Edit URL</Button>
            <Button variant="outline-danger" size="sm" icon={Trash2} onClick={handleRemove} className="ml-auto">Hapus</Button>
          </div>
          {showManual && <div className="px-3 pb-3 pt-2.5 border-t border-border">{manualEditor('Atau tempel URL gambar langsung (harus bisa diakses publik):', 'Simpan')}</div>}
        </div>
      )}

      {/* ── State: uploading ── */}
      {isUploading && (
        <div className="rounded-md border border-border bg-sunken p-4 flex flex-col gap-3" role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-sm bg-green-50 text-brand flex items-center justify-center shrink-0"><UploadCloud size={18} className="animate-bounce" aria-hidden /></span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-primary truncate">{uploadState.filename}</p>
              <p className="text-sm text-secondary">Mengunggah ke Supabase Storage…</p>
            </div>
            <span className="text-base font-bold tabular-nums text-brand">{uploadState.progress}%</span>
          </div>
          <Progress value={uploadState.progress} height={6} label="Progres unggah" />
        </div>
      )}

      {/* ── State: error ── */}
      {isError && (
        <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 flex items-start gap-3">
          <AlertOctagon size={18} className="text-rose-500 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-rose-600">Upload gagal</p>
            <p className="text-sm text-bark-700">{uploadState.message}</p>
          </div>
          <Button variant="outline-danger" size="sm" onClick={() => setUploadState({ status: 'idle' })}>Coba lagi</Button>
        </div>
      )}

      {/* ── State: idle / drop zone ── */}
      {!isSuccess && !isUploading && (
        <button
          type="button"
          aria-label="Area upload gambar, klik atau seret file ke sini"
          className={cn(
            'rounded-md border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2.5 py-7 px-4 text-center',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
            isDragover ? 'border-brand bg-green-50' : 'border-border-strong bg-sunken hover:bg-muted',
          )}
          onDragOver={e => { e.preventDefault(); setUploadState({ status: 'dragover' }) }}
          onDragLeave={() => setUploadState({ status: 'idle' })}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className={cn('w-12 h-12 rounded-md flex items-center justify-center', isDragover ? 'bg-green-100 text-green-700' : 'bg-surface text-brand border border-border')}>
            <UploadCloud size={22} aria-hidden />
          </span>
          <span>
            <span className="block text-base font-semibold text-primary">{isDragover ? 'Lepaskan untuk upload' : 'Seret gambar ke sini'}</span>
            <span className="block text-sm text-secondary mt-0.5">atau <span className="underline font-semibold text-link">klik untuk memilih file</span></span>
            <span className="block text-xs text-secondary mt-1.5">PNG, JPG, WebP, GIF · Maks {MAX_SIZE_MB} MB · Upload ke Supabase Storage</span>
          </span>
        </button>
      )}

      {/* Manual URL fallback (idle state) */}
      {!isSuccess && !isUploading && (
        <div>
          <Button variant="link" size="sm" className="px-0" aria-expanded={showManual} onClick={() => setShowManual(v => !v)}>
            {showManual ? 'Sembunyikan' : 'Atau tempel URL gambar langsung'}
          </Button>
          {showManual && <div className="mt-1">{manualEditor('URL gambar (harus bisa diakses publik)', 'Pakai URL ini')}</div>}
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
        tabIndex={-1}
      />
    </div>
  )
}
