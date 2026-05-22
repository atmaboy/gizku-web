'use client'

import { useRef, useState, useCallback } from 'react'

interface Props {
  value: string          // current URL (kosong = belum ada gambar)
  onChange: (url: string) => void
  disabled?: boolean
}

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_MB   = 5

export default function HeroImageUploader({ value, onChange, disabled }: Props) {
  const inputRef               = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState('')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)  // blob URL untuk preview lokal

  // ─── Validasi file ───────────────────────────────────────────
  function validate(file: File): string {
    if (!ACCEPTED.includes(file.type))
      return `Format tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, atau GIF.`
    if (file.size > MAX_MB * 1024 * 1024)
      return `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal ${MAX_MB} MB.`
    return ''
  }

  // ─── Upload ──────────────────────────────────────────────────
  const upload = useCallback(async (file: File) => {
    const errMsg = validate(file)
    if (errMsg) { setError(errMsg); return }

    // Tampilkan preview lokal dulu (optimistic UI)
    const blobUrl = URL.createObjectURL(file)
    setPreviewSrc(blobUrl)
    setError('')
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      if (value) fd.append('oldUrl', value)  // server akan hapus gambar lama

      const res  = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Upload gagal')
        setPreviewSrc(null)  // batalkan preview
        return
      }

      onChange(json.url)   // simpan URL final ke parent
      setPreviewSrc(null)  // pakai URL final, bukan blob
    } catch {
      setError('Terjadi kesalahan saat upload')
      setPreviewSrc(null)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(blobUrl)
    }
  }, [value, onChange])

  // ─── Hapus gambar ────────────────────────────────────────────
  async function handleDelete() {
    if (!value) return
    setDeleting(true)
    setError('')
    try {
      await fetch('/api/admin/delete-image', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: value }),
      })
      onChange('')  // kosongkan di parent
    } catch {
      setError('Gagal menghapus gambar')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Drag & Drop ─────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true)  }
  function onDragLeave()                  { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  // ─── File input change ───────────────────────────────────────
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = ''  // reset agar bisa upload file yang sama lagi
  }

  const displaySrc = previewSrc ?? (value || null)
  const isLoading  = uploading || deleting

  return (
    <div className="space-y-2">

      {/* Drop zone / preview area */}
      <div
        role="button"
        tabIndex={disabled || isLoading ? -1 : 0}
        aria-label="Upload gambar hero"
        onClick={() => !isLoading && !disabled && inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !isLoading && !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative rounded-xl border-2 transition-all overflow-hidden cursor-pointer"
        style={{
          borderColor:     dragging ? '#2ECC71' : (displaySrc ? '#E5E7EB' : '#D1D5DB'),
          borderStyle:     displaySrc ? 'solid' : 'dashed',
          backgroundColor: dragging ? '#F0FDF4' : (displaySrc ? '#F9FAFB' : '#FAFAFA'),
          minHeight:       displaySrc ? 0 : 120,
          opacity:         disabled ? 0.6 : 1,
          boxShadow:       dragging ? '0 0 0 3px rgba(46,204,113,0.2)' : 'none',
        }}
      >
        {/* State: ada gambar */}
        {displaySrc && (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt="Hero image preview"
              width={800}
              height={450}
              className="w-full object-cover rounded-xl"
              style={{ maxHeight: 220, objectPosition: 'center top' }}
              onError={() => { if (!previewSrc) onChange('') }}
            />

            {/* Overlay on hover */}
            {!isLoading && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#111827] shadow hover:bg-[#F3F4F6] min-h-[36px] transition-colors"
                >
                  Ganti Gambar
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleDelete() }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EF4444] text-white shadow hover:bg-[#DC2626] min-h-[36px] transition-colors"
                >
                  Hapus
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-2">
                <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <p className="text-white text-xs font-medium">{uploading ? 'Mengupload…' : 'Menghapus…'}</p>
              </div>
            )}
          </div>
        )}

        {/* State: kosong */}
        {!displaySrc && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center select-none">
            {uploading ? (
              <>
                <svg className="animate-spin mb-3 text-[#2ECC71]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <p className="text-sm text-[#6B7280]">Mengupload gambar…</p>
              </>
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ background: dragging ? '#D1FAE5' : '#F3F4F6' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dragging ? '#059669' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#374151]">
                  {dragging ? 'Lepaskan untuk upload' : 'Klik atau drag & drop gambar'}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">JPEG, PNG, WebP, GIF · Maks. {MAX_MB} MB</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* URL input manual (opsional fallback) */}
      <details className="group">
        <summary className="text-[11px] text-[#9CA3AF] cursor-pointer hover:text-[#6B7280] transition-colors select-none list-none flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-open:rotate-90 transition-transform">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Atau masukkan URL gambar secara manual
        </summary>
        <input
          type="url"
          value={value}
          onChange={e => { onChange(e.target.value); setError('') }}
          placeholder="https://…"
          disabled={disabled || uploading}
          className="mt-1.5 w-full text-xs px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71] transition-all disabled:opacity-50"
        />
      </details>

      {/* Error message */}
      {error && (
        <p className="text-xs text-[#EF4444] flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled || isLoading}
      />
    </div>
  )
}
