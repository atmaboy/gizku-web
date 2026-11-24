import { describe, expect, it } from 'vitest'
import {
  bucketByWibDay, buildMonthly, buildWeekly, burnInsight, daysInMonth, intakeStatus, macroMatches, monthlyFetchRange, weekStart,
} from '@/lib/statsCalc'

describe('intakeStatus (±10%)', () => {
  it('batas 90% dan 110% termasuk sesuai', () => {
    expect(intakeStatus(0, 2000, 10)).toBe('none')
    expect(intakeStatus(1799, 2000, 10)).toBe('under')
    expect(intakeStatus(1800, 2000, 10)).toBe('on')
    expect(intakeStatus(2200, 2000, 10)).toBe('on')
    expect(intakeStatus(2201, 2000, 10)).toBe('over')
  })
  it('mengikuti toleransi config', () => { expect(intakeStatus(1850, 2000, 5)).toBe('under') })
})

describe('minggu Senin–Minggu', () => {
  it('Jumat 13 Nov 2026 → Senin 9 Nov', () => { expect(weekStart('2026-11-13')).toBe('2026-11-09') })
  it('Minggu 15 Nov masih minggu yang sama; Senin 16 Nov minggu baru', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-09')
    expect(weekStart('2026-11-16')).toBe('2026-11-16')
  })
})

describe('buildWeekly', () => {
  const today = '2026-11-13'
  const byDay = { '2026-11-09': 1900, '2026-11-10': 2100, '2026-11-11': 1500, '2026-11-12': 2500, '2026-11-13': 1540 }
  const w = buildWeekly(today, byDay, 2000, 10, today)
  it('7 hari, hari depan = future', () => {
    expect(w.days).toHaveLength(7)
    expect(w.days.map(d => d.status)).toEqual(['on', 'on', 'under', 'over', 'under', 'future', 'future'])
  })
  it('total, hari tercatat, rata-rata, target×7', () => {
    expect(w.totalKcal).toBe(9540)
    expect(w.loggedDays).toBe(5)
    expect(w.elapsedDays).toBe(5)
    expect(w.avgKcal).toBe(1908)
    expect(w.targetKcal).toBe(14000)
  })
  it('hari tanpa makan tidak dihitung tercatat tapi dihitung berjalan', () => {
    const x = buildWeekly(today, { '2026-11-13': 1000 }, 2000, 10, today)
    expect(x.loggedDays).toBe(1); expect(x.elapsedDays).toBe(5); expect(x.avgKcal).toBe(1000)
  })
  it('minggu lalu penuh 7 hari berjalan; minggu depan 0', () => {
    expect(buildWeekly('2026-11-05', {}, 2000, 10, today).elapsedDays).toBe(7)
    const f = buildWeekly('2026-11-20', {}, 2000, 10, today)
    expect(f.elapsedDays).toBe(0); expect(f.days.every(d => d.status === 'future')).toBe(true)
  })
})

describe('daysInMonth', () => {
  it('28/29/30/31 hari', () => {
    expect(daysInMonth('2027-02-10')).toBe(28)
    expect(daysInMonth('2028-02-10')).toBe(29)
    expect(daysInMonth('2026-11-01')).toBe(30)
    expect(daysInMonth('2026-12-31')).toBe(31)
  })
})

describe('buildMonthly', () => {
  const today = '2026-11-13'
  const m = buildMonthly(today, { '2026-11-02': 2000, '2026-11-13': 1000, '2026-10-20': 2000 }, 2000, 10, today)
  it('target bulan = harian × jumlah hari penuh (Nov = 60.000)', () => { expect(m.targetKcal).toBe(60000); expect(m.days).toHaveLength(30) })
  it('hari tercatat / berjalan', () => { expect(m.loggedDays).toBe(2); expect(m.elapsedDays).toBe(13); expect(m.totalKcal).toBe(3000) })
  it('7 minggu berakhir di minggu yang memuat 30 Nov (Senin 30 Nov)', () => {
    expect(m.weeks.map(w => w.start)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
  })
  it('minggu berjalan & masa depan', () => {
    const cur = m.weeks.find(w => w.isCurrent)!
    expect(cur.start).toBe('2026-11-09')
    expect(m.weeks[4].isFuture).toBe(true); expect(m.weeks[4].status).toBe('future')
  })
  it('minggu memakai kkal lintas bulan (20 Okt masuk minggu 19 Okt) dan status vs target×7', () => {
    expect(m.weeks[0].kcal).toBe(2000)
    expect(m.weeks[0].status).toBe('under')
  })
  it('rentang fetch mencakup 7 minggu', () => {
    expect(monthlyFetchRange(today)).toEqual({ from: '2026-10-19', to: '2026-12-06' })
  })
})

describe('batas hari WIB', () => {
  it('23.30 WIB dan 00.10 WIB masuk hari berbeda', () => {
    const r = bucketByWibDay([
      { loggedAt: '2026-11-12T16:30:00.000Z', kcal: 300 }, // 23.30 WIB 12 Nov
      { loggedAt: '2026-11-12T17:10:00.000Z', kcal: 500 }, // 00.10 WIB 13 Nov
      { loggedAt: '2026-11-13T02:00:00.000Z', kcal: 200 }, // 09.00 WIB 13 Nov
    ])
    expect(r).toEqual({ '2026-11-12': 300, '2026-11-13': 700 })
  })
})

describe('burnInsight & macroMatches', () => {
  it('610 kkal di bawah rata-rata', () => {
    expect(burnInsight(2150, 1540)).toEqual({ diff: 610, direction: 'below' })
    expect(burnInsight(2150, 2300)).toEqual({ diff: 150, direction: 'above' })
  })
  it('toleransi maks(50, 5%)', () => {
    expect(macroMatches(100, 250, 67, 2000, 5)).toMatchObject({ total: 2003, ok: true })
    expect(macroMatches(100, 250, 67, 2000, 5).diff).toBe(3)
    expect(macroMatches(150, 250, 67, 2000, 5).ok).toBe(false)
    expect(macroMatches(100, 250, 67, 4000, 5).ok).toBe(false) // |2003-4000| > 200
  })
})
