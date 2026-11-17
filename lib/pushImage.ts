/**
 * Gambar banner push. FCM hanya menampilkan gambar notifikasi sampai ±1 MB; lebih besar dari itu
 * dibuang diam-diam oleh Android. Batas ini dipakai form (kompres otomatis + validasi), API admin,
 * dan halaman detail batch.
 */
export const BANNER_MAX_BYTES = 1_000_000
export const BANNER_TARGET_BYTES = 900_000
export const BANNER_WIDTH = 1024
export const BANNER_HEIGHT = 512

export const fmtMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** Hanya URL di storage Supabase kita yang boleh di-HEAD server (cegah SSRF ke host lain). */
export function isOwnStorageUrl(raw: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): boolean {
  try {
    if (!supabaseUrl) return false
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname === new URL(supabaseUrl).hostname
  } catch { return false }
}
