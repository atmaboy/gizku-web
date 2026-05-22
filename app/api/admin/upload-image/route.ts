/**
 * POST /api/admin/upload-image
 *
 * Menerima multipart/form-data dengan field:
 *   - file   : File gambar (jpeg | jpg | png | webp | gif, max 5MB)
 *   - oldUrl : (opsional) URL lama yang akan dihapus setelah upload berhasil
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

  // Validasi file
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Field "file" wajib diisi' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipe file tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, atau GIF.` },
      { status: 400 },
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 5 MB.` },
      { status: 400 },
    )
  }

  // Buat nama file unik: hero/[timestamp]-[random].[ext]
  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

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
