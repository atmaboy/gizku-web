import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDaysISO, fmtDate, fmtDateTime, fmtDateTimePrecise, todayISO, wibDateISO, wibDayEnd, wibDayStart } from './utils'

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

describe('day boundaries follow WIB (UTC+7)', () => {
  afterEach(() => vi.useRealTimers())

  it('todayISO rolls over at 00.00 WIB (17.00 UTC), not 00.00 UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-22T16:59:59Z')) // 23.59 WIB, still the 22nd
    expect(todayISO()).toBe('2026-11-22')
    vi.setSystemTime(new Date('2026-11-22T17:00:00Z')) // 00.00 WIB, the 23rd
    expect(todayISO()).toBe('2026-11-23')
  })
  it('a meal logged at 02.00 WIB belongs to that WIB day, not the previous UTC day', () => {
    expect(wibDateISO('2026-11-22T19:00:00Z')).toBe('2026-11-23') // 02.00 WIB on the 23rd
    expect(wibDateISO('2026-11-22T16:59:00Z')).toBe('2026-11-22')
  })
  it('wibDayStart / wibDayEnd cover exactly one WIB day', () => {
    expect(wibDayStart('2026-11-23').toISOString()).toBe('2026-11-22T17:00:00.000Z')
    expect(wibDayEnd('2026-11-23').toISOString()).toBe('2026-11-23T16:59:59.999Z')
    // the 02.00 WIB meal above falls inside the 23rd
    const t = new Date('2026-11-22T19:00:00Z').getTime()
    expect(t >= wibDayStart('2026-11-23').getTime() && t <= wibDayEnd('2026-11-23').getTime()).toBe(true)
  })
  it('addDaysISO is pure calendar math, across month and year ends', () => {
    expect(addDaysISO('2026-11-22', -9)).toBe('2026-11-13')
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })
})
