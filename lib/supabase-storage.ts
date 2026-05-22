/**
 * Supabase Storage helper — dipakai server-side via service_role key
 * Bucket: hero-images (public, max 5MB, image/* only)
 */

const SUPABASE_URL        = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET              = 'hero-images'

function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`
}

export function getPublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

/**
 * Upload sebuah file ke bucket hero-images.
 * @param file   — File/Blob yang akan diupload
 * @param path   — Path tujuan di dalam bucket, misal: "hero/main.webp"
 * @returns public URL jika sukses
 */
export async function uploadHeroImage(
  file: File | Blob,
  path: string,
): Promise<{ url: string; path: string }> {
  const res = await fetch(storageUrl(path), {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert':     'true',   // overwrite jika sudah ada
    },
    body: file,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase Storage upload gagal: ${res.status} — ${err}`)
  }

  return { url: getPublicUrl(path), path }
}

/**
 * Hapus file dari bucket hero-images berdasarkan path.
 * @param path — Path file di dalam bucket, misal: "hero/main.webp"
 */
export async function deleteHeroImage(path: string): Promise<void> {
  const res = await fetch(storageUrl(path), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  // 404 berarti file sudah tidak ada — tidak perlu throw
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Supabase Storage delete gagal: ${res.status} — ${err}`)
  }
}

/**
 * Ekstrak path relatif dari public URL Supabase Storage.
 * Contoh input : "https://xxx.supabase.co/storage/v1/object/public/hero-images/hero/abc.webp"
 * Contoh output: "hero/abc.webp"
 */
export function extractPathFromUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx    = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}
