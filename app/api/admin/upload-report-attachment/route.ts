/**
 * POST /api/admin/upload-report-attachment
 *
 * Menerima multipart/form-data dengan field:
 *   - file : File gambar (jpeg | jpg | png | webp | gif) atau video
 *            (mp4 | mov | webm), maks 5MB
 *
 * Mengembalikan:
 *   { url: string, kind: 'image' | 'video', sizeBytes: number }
 *
 * Akses dilindungi: hanya admin (dicek via lib/admin.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin'
import { uploadReportAttachment }    from '@/lib/supabase-storage'

const MAX_SIZE      = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm']

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

  const isImage = ALLOWED_IMAGE.includes(file.type)
  const isVideo = ALLOWED_VIDEO.includes(file.type)
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: `Tipe file tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, GIF, MP4, MOV, atau WebM.` },
      { status: 400 },
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 5 MB.` },
      { status: 400 },
    )
  }

  const ext      = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  try {
    const { url } = await uploadReportAttachment(file, filename)
    return NextResponse.json({ url, kind: isVideo ? 'video' : 'image', sizeBytes: file.size })
  } catch (err) {
    console.error('[upload-report-attachment] Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload gagal' },
      { status: 500 },
    )
  }
}
