import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function todayISO() { return new Date().toISOString().split('T')[0] }

export function fmtDate(d: Date | string | null) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(d))
}

export function fmtDateTime(d: Date | string | null) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export function fmtNum(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('id-ID')
}

/** "3 jam lalu" / "Kemarin" / "5 hari lalu" — falls back to fmtDate() past ~5 weeks. */
export function fmtRelativeID(d: Date | string | null) {
  if (!d) return '-'
  const date = new Date(d)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay === 1) return 'Kemarin'
  if (diffDay < 7) return `${diffDay} hari lalu`
  const diffWeek = Math.floor(diffDay / 7)
  if (diffWeek < 5) return `${diffWeek} minggu lalu`
  return fmtDate(date)
}

/** "8 Agustus 2026 13:24:07" — precise, absolute (support/trace value over friendliness). */
export function fmtDateTimePrecise(d: Date | string | null) {
  if (!d) return '-'
  const date = new Date(d)
  const datePart = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  const timePart = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
  return `${datePart} ${timePart}`
}

/** "8 Agustus 2026" */
export function fmtDateLongID(d: Date | string | null) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
}

export function setCors(h: Headers) {
  h.set('Access-Control-Allow-Origin', '*')
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  h.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  }
}

export const ok = (data: unknown) =>
  Response.json(data, { headers: corsHeaders() })

export const err = (msg: string, status = 400) =>
  Response.json({ error: msg }, { status, headers: corsHeaders() })
