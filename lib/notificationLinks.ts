/**
 * Tautan tujuan notifikasi blast push: daftar layar app, validasi URL terhadap
 * Whitelist Domain, dan normalisasi input domain. Murni (tanpa DB) supaya bisa
 * dipakai di server, form backoffice, dan dites.
 *
 * Daftar layar HARUS sama dengan yang ada di gizku-mobile (src/utils/notificationLink.ts).
 */

export type LinkType = 'detail' | 'screen' | 'url'
export const LINK_TYPES: LinkType[] = ['detail', 'screen', 'url']

/** key → label di backoffice. Route-nya diatur di sisi mobile. */
export const NOTIFICATION_SCREENS: { key: string; label: string }[] = [
  { key: 'riwayat',  label: 'Riwayat' },
  { key: 'limit',    label: 'Request kenaikan limit' },
  { key: 'telegram', label: 'Pengaturan Telegram' },
  { key: 'language', label: 'Pengaturan Bahasa' },
  { key: 'report',   label: 'Kirim masukan' },
]

export type WhitelistEntry = { domain: string; includeSubdomains: boolean }

export type UrlCheck =
  | { ok: true; host: string }
  | { ok: false; reason: 'empty' | 'format' | 'https' | 'not_whitelisted'; host?: string }

export function checkWhitelistedUrl(rawUrl: string, list: WhitelistEntry[]): UrlCheck {
  const trimmed = rawUrl.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }
  let u: URL
  try { u = new URL(trimmed) } catch { return { ok: false, reason: 'format' } }
  if (u.protocol !== 'https:') return { ok: false, reason: u.protocol === 'http:' ? 'https' : 'format' }
  const host = u.hostname.toLowerCase()
  const hit = list.find(w => host === w.domain || (w.includeSubdomains && host.endsWith('.' + w.domain)))
  return hit ? { ok: true, host } : { ok: false, reason: 'not_whitelisted', host }
}

export const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

/** Trim, lowercase, buang skema/path/port/www. Mengembalikan null kalau bukan domain valid. */
export function normalizeDomain(raw: string): string | null {
  let d = raw.trim().toLowerCase()
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  d = d.split(/[/?#]/)[0]
  d = d.replace(/:\d+$/, '').replace(/^www\./, '')
  return DOMAIN_RE.test(d) ? d : null
}

export const URL_CHECK_MESSAGES = {
  format: 'Format URL belum benar. Contoh: https://gizku.com/tips',
  https: 'Tautan harus diawali https://.',
  notWhitelisted: (host: string) => `Domain ${host} belum di-whitelist, jadi blast tidak bisa dikirim.`,
}

/** Pesan error server untuk hasil cek yang gagal. */
export function urlCheckError(c: Extract<UrlCheck, { ok: false }>): string {
  if (c.reason === 'not_whitelisted') return URL_CHECK_MESSAGES.notWhitelisted(c.host ?? '')
  if (c.reason === 'https') return URL_CHECK_MESSAGES.https
  return URL_CHECK_MESSAGES.format
}
