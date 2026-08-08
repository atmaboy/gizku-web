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

// ── Report attachments (helpdesk replies) ────────────────────────────────────
// Separate bucket from hero-images — user/admin-uploaded support attachments
// (image + video) have a different lifecycle & mime-type surface than CMS
// hero images. Created lazily on first upload so staging doesn't need a
// manual Supabase dashboard step.
const REPORTS_BUCKET = 'report-attachments'

let reportsBucketEnsured = false

async function ensureReportsBucket(): Promise<void> {
  if (reportsBucketEnsured) return
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: REPORTS_BUCKET,
        name: REPORTS_BUCKET,
        public: true,
        allowed_mime_types: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
          'video/mp4', 'video/quicktime', 'video/webm',
        ],
      }),
    })
    // 400/409 here just means the bucket already exists — fine either way.
    if (!res.ok && res.status !== 400 && res.status !== 409) {
      console.warn('[supabase-storage] gagal memastikan bucket report-attachments:', res.status, await res.text())
    }
  } catch (e) {
    console.warn('[supabase-storage] gagal memastikan bucket report-attachments:', e)
  }
  reportsBucketEnsured = true
}

function reportsStorageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/${REPORTS_BUCKET}/${path}`
}

export function getReportAttachmentPublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${REPORTS_BUCKET}/${path}`
}

/**
 * Upload lampiran laporan (foto/video) ke bucket report-attachments.
 * @param file — File/Blob yang akan diupload
 * @param path — Path tujuan di dalam bucket, misal: "1234567-ab12cd.jpg"
 */
export async function uploadReportAttachment(
  file: File | Blob,
  path: string,
): Promise<{ url: string; path: string }> {
  await ensureReportsBucket()
  const res = await fetch(reportsStorageUrl(path), {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert':     'true',
    },
    body: file,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase Storage upload gagal: ${res.status} — ${err}`)
  }

  return { url: getReportAttachmentPublicUrl(path), path }
}
