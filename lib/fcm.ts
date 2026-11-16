/**
 * Kirim push langsung lewat Firebase Cloud Messaging HTTP v1 (tanpa Expo Push), dipakai untuk token
 * FCM native Android. Alasan utama: gambar besar di banner (`notification.image`) hanya dirender
 * Android kalau pesan datang sebagai FCM notification message.
 *
 * Kredensial: env FCM_SERVICE_ACCOUNT_JSON = isi file JSON service account Firebase (mentah atau
 * base64). Staging dan production memakai project Firebase masing-masing.
 */
import { SignJWT, importPKCS8 } from 'jose'

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CONCURRENCY = 20

export type ServiceAccount = { project_id: string; client_email: string; private_key: string }

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const candidates = [trimmed]
  try { candidates.push(Buffer.from(trimmed, 'base64').toString('utf8')) } catch { /* bukan base64 */ }
  for (const c of candidates) {
    try {
      const j = JSON.parse(c)
      if (j.project_id && j.client_email && j.private_key) {
        return { project_id: j.project_id, client_email: j.client_email, private_key: String(j.private_key).replace(/\\n/g, '\n') }
      }
    } catch { /* coba kandidat berikutnya */ }
  }
  return null
}

let cachedSa: ServiceAccount | null | undefined
function serviceAccount() {
  if (cachedSa === undefined) cachedSa = parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON)
  return cachedSa
}

export function isFcmConfigured() {
  return serviceAccount() !== null
}

let cachedToken: { value: string; exp: number } | null = null

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value

  const key = await importPKCS8(sa.private_key, 'RS256')
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const json = await res.json().catch(() => null) as { access_token?: string; expires_in?: number; error_description?: string } | null
  if (!res.ok || !json?.access_token) throw new Error(`Gagal mengambil access token FCM: ${json?.error_description ?? res.status}`)
  cachedToken = { value: json.access_token, exp: now + (json.expires_in ?? 3600) }
  return cachedToken.value
}

/** Channel notifikasi Android (dibuat app dengan importance HIGH supaya banner muncul sebagai pop-up). */
export const ANDROID_CHANNEL_ID = 'gizku_alerts'

export type FcmInput = {
  token: string
  title: string
  body: string
  imageUrl?: string | null
  /** Nilai null/undefined dibuang — FCM data hanya menerima string. */
  data?: Record<string, string | null | undefined>
}

export function buildFcmMessage(m: FcmInput) {
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(m.data ?? {})) if (v !== null && v !== undefined) data[k] = String(v)
  return {
    message: {
      token: m.token,
      notification: { title: m.title, body: m.body, ...(m.imageUrl ? { image: m.imageUrl } : {}) },
      data,
      android: {
        priority: 'HIGH' as const,
        notification: { channel_id: ANDROID_CHANNEL_ID, ...(m.imageUrl ? { image: m.imageUrl } : {}) },
      },
    },
  }
}

export type FcmResult =
  | { ok: true; name: string }
  | { ok: false; message: string; /** token tidak valid lagi → nonaktifkan */ unregistered: boolean; raw?: unknown }

type FcmErrorBody = { error?: { code?: number; status?: string; message?: string; details?: { errorCode?: string }[] } }

async function sendOne(sa: ServiceAccount, accessToken: string, m: FcmInput): Promise<FcmResult> {
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildFcmMessage(m)),
    })
    const json = await res.json().catch(() => null) as ({ name?: string } & FcmErrorBody) | null
    if (res.ok && json?.name) return { ok: true, name: json.name }
    const codes = (json?.error?.details ?? []).map(d => d.errorCode)
    const unregistered = res.status === 404 || codes.includes('UNREGISTERED')
    return { ok: false, unregistered, message: json?.error?.message ?? `FCM HTTP ${res.status}`, raw: json }
  } catch (e) {
    return { ok: false, unregistered: false, message: e instanceof Error ? e.message : 'Gagal menghubungi FCM' }
  }
}

/** Kirim banyak pesan (urutan hasil = urutan input). Melempar kalau kredensial tidak ada / access token gagal. */
export async function sendFcmMessages(messages: FcmInput[]): Promise<FcmResult[]> {
  const sa = serviceAccount()
  if (!sa) throw new Error('FCM_SERVICE_ACCOUNT_JSON belum dikonfigurasi')
  const accessToken = await getAccessToken(sa)
  const results: FcmResult[] = new Array(messages.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, messages.length) }, async () => {
    while (next < messages.length) {
      const i = next++
      results[i] = await sendOne(sa, accessToken, messages[i])
    }
  }))
  return results
}
