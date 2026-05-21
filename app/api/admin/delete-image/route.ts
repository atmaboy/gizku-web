/**
 * DELETE /api/admin/delete-image
 *
 * Body JSON: { url: string }  — public URL gambar yang akan dihapus
 *
 * Akses dilindungi: hanya admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin'
import { deleteHeroImage, extractPathFromUrl } from '@/lib/supabase-storage'

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  let url: string
  try {
    const body = await req.json()
    url = body?.url
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 })
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Field "url" wajib diisi' }, { status: 400 })
  }

  const path = extractPathFromUrl(url)
  if (!path) {
    return NextResponse.json({ error: 'URL bukan Supabase Storage URL yang valid' }, { status: 400 })
  }

  try {
    await deleteHeroImage(path)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-image] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Hapus gagal' },
      { status: 500 },
    )
  }
}
