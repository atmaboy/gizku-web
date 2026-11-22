/**
 * Aturan ubah tanggal makan (mobile): hanya dalam 24 jam setelah scan, rentang hari ini sampai 6 hari lalu,
 * tidak boleh di masa depan. Patokan 24 jam = meals.scanned_at (tidak pernah berubah), bukan logged_at.
 */
export const DATE_EDIT_WINDOW_MS = 24 * 3600_000
/** Toleransi jam perangkat yang sedikit maju (sama dengan POST /api/history). */
export const FUTURE_SKEW_MS = 5 * 60_000
/** Hari ini + 6 hari sebelumnya; di server diperkirakan sebagai now - 7 hari (hari lokal user tidak diketahui). */
export const MAX_BACKDATE_MS = 7 * 24 * 3600_000

export type LoggedAtCheck =
  | { ok: true; date: Date }
  | { ok: false; status: 400 | 409; error: string; code?: 'DATE_LOCKED' | 'DATE_INVALID' }

export function checkLoggedAtChange(input: { loggedAt: unknown; scannedAt: Date; now?: number }): LoggedAtCheck {
  const now = input.now ?? Date.now()
  if (typeof input.loggedAt !== 'string' || isNaN(new Date(input.loggedAt).getTime())) {
    return { ok: false, status: 400, error: 'Tanggal tidak valid', code: 'DATE_INVALID' }
  }
  // Kunci 24 jam diperiksa lebih dulu: setelah lewat, apa pun isi tanggalnya ditolak dengan alasan yang sama.
  if (now - input.scannedAt.getTime() > DATE_EDIT_WINDOW_MS) {
    return { ok: false, status: 409, error: 'Tanggal tidak bisa diubah, sudah lewat 24 jam sejak scan', code: 'DATE_LOCKED' }
  }
  const date = new Date(input.loggedAt)
  if (date.getTime() > now + FUTURE_SKEW_MS) {
    return { ok: false, status: 400, error: 'Tanggal tidak boleh di masa depan', code: 'DATE_INVALID' }
  }
  if (date.getTime() < now - MAX_BACKDATE_MS) {
    return { ok: false, status: 400, error: 'Tanggal terlalu lama (maksimal 7 hari terakhir)', code: 'DATE_INVALID' }
  }
  return { ok: true, date }
}
