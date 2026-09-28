/**
 * Pure formatting helpers for the landing page (safe on server and client).
 */

/**
 * "Bulatkan ke bawah + '+'" — the rounding used for automatic stats:
 *   < 10       → exact ("7")
 *   < 1.000    → floor to tens      (437    → "430+")
 *   < 100.000  → floor to thousands (12.431 → "12.000+")
 *   otherwise  → floor to ten-thousands (523.900 → "520.000+")
 * Formatted with the id-ID thousands separator.
 */
export function formatFloorPlus(n: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))
  if (v < 10) return v.toLocaleString('id-ID')
  const step = v < 1_000 ? 10 : v < 100_000 ? 1_000 : 10_000
  return `${(Math.floor(v / step) * step).toLocaleString('id-ID')}+`
}

export function formatFull(n: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))
  return v.toLocaleString('id-ID')
}

export function formatStat(n: number, format: 'floor_plus' | 'full'): string {
  return format === 'full' ? formatFull(n) : formatFloorPlus(n)
}

/** Replace the `{tahun}` token (case-insensitive) with the given year. */
export function applyYearToken(text: string, year: number = new Date().getFullYear()): string {
  return text.replace(/\{tahun\}/gi, String(year))
}

/** First letter for avatar initials. */
export function initialOf(name: string): string {
  return (name.replace(/^[\s[@(]+/, '').trim().charAt(0) || '?').toUpperCase()
}

/** Plain-text length of an HTML fragment (for the 500-char FAQ answer counter). */
export function htmlTextLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39);/g, 'x')
    .length
}
