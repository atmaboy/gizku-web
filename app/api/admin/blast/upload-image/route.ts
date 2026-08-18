/**
 * POST /api/admin/blast/upload-image
 *
 * Upload gambar untuk disisipkan ke body email blast (app/admin/blast/new).
 * Menerima multipart/form-data dengan field:
 *   - file : File gambar (jpeg | jpg | png | webp | gif, max 5MB)
 *
 * Mengembalikan:
 *   { url: string } — public URL gambar yang baru diupload
 *
 * Tidak ada penghapusan gambar lama seperti /api/admin/upload-image — satu
 * body email blast bisa berisi beberapa gambar, dan gambar yang sudah pernah
 * terkirim harus tetap bisa dimuat kalau penerima membuka emailnya belakangan.
 * Pakai bucket hero-images yang sama (lewat lib/supabase-storage.ts), cuma
 * beda prefix path ("blast/" bukan "hero/").
 *
 * Akses dilindungi: hanya admin (dicek via lib/admin.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin'
import { uploadHeroImage } from '@/lib/supabase-storage'

const MAX_SIZE      = 5 * 1024 * 1024  // 5MB
const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Request bukan multipart form-data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null

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

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `blast/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  try {
    const { url } = await uploadHeroImage(file, filename)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[admin/blast/upload-image] Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload gagal' },
      { status: 500 },
    )
  }
}
