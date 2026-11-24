/**
 * Gerbang maintenance untuk middleware (Edge runtime — jangan import drizzle/db di sini).
 *
 * Saat maintenance aktif, SEMUA endpoint /api/* yang dipakai user (riwayat, profil, limit, laporan,
 * notifikasi, push, dll.) harus menjawab 503 + field `maintenance`. Klien mobile membaca field itu di
 * setiap respons (gizku-mobile: src/api/client.ts) lalu logout otomatis dan membuka halaman maintenance.
 * Sebelumnya hanya login/register dan analyze yang dijaga, sehingga user yang sudah login tetap bisa
 * memakai app.
 */

/** Prefix API yang TETAP hidup saat maintenance. */
const EXEMPT_PREFIXES = [
  '/api/maintenance',    // klien perlu tahu kapan maintenance selesai
  '/api/admin',          // backoffice punya auth sendiri; admin harus bisa mematikan maintenance
  '/api/cron',           // dilindungi CRON_SECRET
  '/api/webhooks',       // callback pihak ketiga (mis. email masuk)
  '/api/telegram',       // webhook Telegram: 503 membuat Telegram mengulang kirim terus
  '/api/landing-content', '/api/footer-content', '/api/legal-content', '/api/announcement', // konten publik
]

export function isMaintenanceExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export type MaintenanceState = { enabled: boolean; title: string; description: string }

const OFF: MaintenanceState = { enabled: false, title: '', description: '' }
let cache: { state: MaintenanceState; ts: number } | null = null
/** Status "mati" boleh di-cache sebentar; status "aktif" tidak, supaya maintenance yang dimatikan langsung terasa. */
const OFF_TTL_MS = 5_000

/** Baca status lewat endpoint publik /api/maintenance. Fail-open (sama seperti lib/maintenance.ts). */
export async function readMaintenanceState(origin: string, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<MaintenanceState> {
  if (cache && !cache.state.enabled && now - cache.ts < OFF_TTL_MS) return cache.state
  try {
    const res = await fetchFn(new URL('/api/maintenance', origin), { cache: 'no-store' })
    if (!res.ok) return OFF
    const d = await res.json() as { enabled?: boolean; title?: string; description?: string }
    const state: MaintenanceState = { enabled: d.enabled === true, title: d.title ?? '', description: d.description ?? '' }
    cache = { state, ts: now }
    return state
  } catch {
    return OFF
  }
}

export function resetMaintenanceGateCache() { cache = null }

export function maintenanceBody(s: MaintenanceState) {
  const title = s.title || 'Aplikasi sedang dalam pemeliharaan'
  const description = s.description || 'Kami sedang melakukan peningkatan sistem. Coba lagi beberapa saat.'
  return { ok: false, error: title, maintenance: { title, description } }
}
