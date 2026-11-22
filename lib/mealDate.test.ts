import { describe, expect, it } from 'vitest'
import { checkLoggedAtChange } from './mealDate'

const now = Date.parse('2026-11-22T10:00:00Z')
const h = (n: number) => n * 3600_000
const scannedAgo = (ms: number) => new Date(now - ms)
const at = (ms: number) => new Date(now + ms).toISOString()

describe('checkLoggedAtChange', () => {
  it('allows a past time within 24h of the scan', () => {
    const r = checkLoggedAtChange({ loggedAt: at(-h(3)), scannedAt: scannedAgo(h(2)), now })
    expect(r.ok).toBe(true)
  })
  it('allows exactly 24h, locks just after', () => {
    expect(checkLoggedAtChange({ loggedAt: at(-h(1)), scannedAt: scannedAgo(h(24)), now }).ok).toBe(true)
    const r = checkLoggedAtChange({ loggedAt: at(-h(1)), scannedAt: scannedAgo(h(24) + 1), now })
    expect(r).toMatchObject({ ok: false, status: 409, code: 'DATE_LOCKED' })
  })
  it('anchors on scannedAt, so an already edited loggedAt cannot extend the window', () => {
    // Scanned 30h ago; the meal was moved to "1h ago" earlier, but the window is measured from the scan.
    const r = checkLoggedAtChange({ loggedAt: at(-h(1)), scannedAt: scannedAgo(h(30)), now })
    expect(r).toMatchObject({ ok: false, code: 'DATE_LOCKED' })
  })
  it('rejects the future beyond the 5 minute clock skew', () => {
    expect(checkLoggedAtChange({ loggedAt: at(4 * 60_000), scannedAt: scannedAgo(h(1)), now }).ok).toBe(true)
    expect(checkLoggedAtChange({ loggedAt: at(6 * 60_000), scannedAt: scannedAgo(h(1)), now })).toMatchObject({ ok: false, status: 400 })
  })
  it('rejects more than 7 days back', () => {
    expect(checkLoggedAtChange({ loggedAt: at(-h(24 * 7) + 60_000), scannedAt: scannedAgo(h(1)), now }).ok).toBe(true)
    expect(checkLoggedAtChange({ loggedAt: at(-h(24 * 7) - 60_000), scannedAt: scannedAgo(h(1)), now })).toMatchObject({ ok: false, status: 400 })
  })
  it('rejects non-date input', () => {
    for (const bad of [undefined, null, 123, 'soon', '']) {
      expect(checkLoggedAtChange({ loggedAt: bad, scannedAt: scannedAgo(h(1)), now })).toMatchObject({ ok: false, status: 400 })
    }
  })
})
