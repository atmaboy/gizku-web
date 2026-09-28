/**
 * POST /api/admin/upload-image
 *
 * Menerima multipart/form-data dengan field:
 *   - file   : File gambar (jpeg | jpg | png | webp | gif, max 5MB)
 *   - oldUrl : (opsional) URL lama yang akan dihapus setelah upload berhasil
 *   - folder : (opsional) tujuan & aturan file (Landing Builder):
 *              landing/hero · landing/og · landing/logo · landing/testimonials ·
 *              landing/features — tiap folder punya tipe & batas ukuran
 *              sendiri (FOLDER_RULES). Tanpa folder = perilaku lama (hero/).
 *
 * Mengembalikan:
 *   { url: string }  — public URL gambar yang baru diupload
 *
 * Akses dilindungi: hanya admin (dicek via lib/admin.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin'
import { uploadHeroImage, deleteHeroImage, extractPathFromUrl } from '@/lib/supabase-storage'

const MAX_SIZE       = 5 * 1024 * 1024  // 5MB
const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

const MB = 1024 * 1024
const FOLDER_RULES: Record<string, { types: string[]; maxBytes: number; label: string }> = {
  'landing/hero':         { types: ['image/png', 'image/webp'],                     maxBytes: 2 * MB, label: 'PNG atau WebP' },
  'landing/og':           { types: ['image/png', 'image/jpeg', 'image/webp'],       maxBytes: 5 * MB, label: 'PNG, JPEG, atau WebP' },
  'landing/logo':         { types: ['image/svg+xml', 'image/png', 'image/webp'],    maxBytes: 1 * MB, label: 'SVG, PNG, atau WebP' },
  'landing/testimonials': { types: ['image/jpeg', 'image/png', 'image/webp'],       maxBytes: 2 * MB, label: 'JPEG, PNG, atau WebP' },
  'landing/features':     { types: ['image/png', 'image/jpeg', 'image/webp'],       maxBytes: 2 * MB, label: 'PNG, JPEG, atau WebP' },
}
const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
}

export async function POST(req: NextRequest) {
  // Auth guard
  const authError = await requireAdmin(req)
  if (authError) return authError

  // Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Request bukan multipart form-data' }, { status: 400 })
  }

  const file   = formData.get('file')   as File | null
  const oldUrl = formData.get('oldUrl') as string | null
  const folderRaw = formData.get('folder')
  const folder = typeof folderRaw === 'string' && folderRaw ? folderRaw : null

  if (folder && !FOLDER_RULES[folder]) {
    return NextResponse.json({ error: `Folder tidak dikenal: ${folder}` }, { status: 400 })
  }
  const rule = folder ? FOLDER_RULES[folder] : { types: ALLOWED_TYPES, maxBytes: MAX_SIZE, label: 'JPEG, PNG, WebP, atau GIF' }

  // Validasi file
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Field "file" wajib diisi' }, { status: 400 })
  }
  if (!rule.types.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipe file tidak didukung: ${file.type || 'tidak diketahui'}. Gunakan ${rule.label}.` },
      { status: 400 },
    )
  }
  if (file.size > rule.maxBytes) {
    return NextResponse.json(
      { error: `Ukuran file terlalu besar (${(file.size / MB).toFixed(1)} MB). Maksimal ${rule.maxBytes / MB} MB.` },
      { status: 400 },
    )
  }

  // Nama file unik: [folder]/[timestamp]-[random].[ext] (ext dari tipe MIME, bukan nama file)
  const ext      = EXT_BY_TYPE[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${folder ?? 'hero'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  try {
    // Upload ke Supabase Storage
    const { url } = await uploadHeroImage(file, filename)

    // Hapus gambar lama jika ada (best-effort, tidak gagalkan response)
    if (oldUrl) {
      const oldPath = extractPathFromUrl(oldUrl)
      if (oldPath) {
        deleteHeroImage(oldPath).catch(e =>
          console.warn('[upload-image] Gagal hapus gambar lama:', e),
        )
      }
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[upload-image] Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload gagal' },
      { status: 500 },
    )
  }
}
