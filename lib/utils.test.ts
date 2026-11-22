import { describe, expect, it } from 'vitest'
import { fmtDate, fmtDateTime, fmtDateTimePrecise } from './utils'

// 22 Nov 2026 13.16 UTC = 20.16 WIB. Server Vercel runs in UTC, so formatting must not depend on process TZ.
const instant = '2026-11-22T13:16:00.000Z'

describe('admin date formatting is pinned to WIB (Asia/Jakarta)', () => {
  it('fmtDateTime shows WIB wall-clock time, not UTC', () => {
    expect(fmtDateTime(instant)).toMatch(/20[.:]16/)
    expect(fmtDateTime(instant)).not.toMatch(/13[.:]16/)
  })
  it('fmtDateTimePrecise shows WIB', () => {
    expect(fmtDateTimePrecise(instant)).toMatch(/20[.:]16[.:]00/)
  })
  it('rolls the calendar day over at 00.00 WIB, not 00.00 UTC', () => {
    // 18.30 UTC on 22 Nov is already 01.30 on 23 Nov in WIB.
    expect(fmtDate('2026-11-22T18:30:00.000Z')).toMatch(/^23 /)
    expect(fmtDate('2026-11-22T16:59:00.000Z')).toMatch(/^22 /)
  })
  it('returns a dash for empty input', () => {
    expect(fmtDateTime(null)).toBe('-')
  })
})
