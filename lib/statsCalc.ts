/**
 * Kalkulasi statistik (murni, tanpa db): pembagian minggu/bulan, status ±toleransi, hari tercatat, rata-rata.
 * Semua tanggal adalah kalender WIB (YYYY-MM-DD). Minggu = Senin–Minggu.
 */
import { addDaysISO, wibDateISO } from '@/lib/utils'

export type DayStatus = 'on' | 'under' | 'over' | 'none' | 'future'
export type MealRow = { loggedAt: Date | string; kcal: number }

/** Status asupan terhadap target: none (0 kkal), under (< 100−tol%), on (±tol%), over (> 100+tol%). */
export function intakeStatus(kcal: number, target: number, tolPct: number): Exclude<DayStatus, 'future'> {
  if (kcal <= 0) return 'none'
  if (kcal < target * (100 - tolPct) / 100) return 'under'
  if (kcal > target * (100 + tolPct) / 100) return 'over'
  return 'on'
}

/** Jumlahkan kkal per tanggal WIB. Meal jam 23.30 WIB dan 00.10 WIB jatuh ke hari yang berbeda. */
export function bucketByWibDay(rows: MealRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const d = wibDateISO(r.loggedAt)
    out[d] = (out[d] ?? 0) + r.kcal
  }
  return out
}

/** Hari dalam seminggu, 0 = Senin … 6 = Minggu. */
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7
}

export function weekStart(date: string): string { return addDaysISO(date, -weekdayIndex(date)) }

export function daysInMonth(date: string): number {
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
export const monthStart = (date: string) => `${date.slice(0, 7)}-01`
export const monthEnd = (date: string) => `${date.slice(0, 7)}-${String(daysInMonth(date)).padStart(2, '0')}`

export type DayPoint = { date: string; kcal: number; status: DayStatus }

function dayPoint(date: string, byDay: Record<string, number>, goal: number, tol: number, today: string): DayPoint {
  if (date > today) return { date, kcal: 0, status: 'future' }
  const kcal = byDay[date] ?? 0
  return { date, kcal, status: intakeStatus(kcal, goal, tol) }
}

function summarize(days: DayPoint[], target: number) {
  const elapsed = days.filter(d => d.status !== 'future')
  const totalKcal = elapsed.reduce((s, d) => s + d.kcal, 0)
  const loggedDays = elapsed.filter(d => d.kcal > 0).length
  return {
    totalKcal,
    loggedDays,
    elapsedDays: elapsed.length,
    avgKcal: loggedDays ? Math.round(totalKcal / loggedDays) : 0,
    targetKcal: target,
  }
}

export function buildWeekly(date: string, byDay: Record<string, number>, goal: number, tol: number, today: string) {
  const start = weekStart(date)
  const days = Array.from({ length: 7 }, (_, i) => dayPoint(addDaysISO(start, i), byDay, goal, tol, today))
  return { start, end: addDaysISO(start, 6), days, ...summarize(days, goal * 7) }
}

export type WeekPoint = { start: string; kcal: number; status: DayStatus; isCurrent: boolean; isFuture: boolean }

/** Rentang tanggal yang perlu dibaca dari DB untuk periode bulanan (7 minggu terakhir ikut tercakup). */
export function monthlyFetchRange(date: string) {
  const lastWeekStart = weekStart(monthEnd(date))
  return { from: addDaysISO(lastWeekStart, -6 * 7), to: addDaysISO(lastWeekStart, 6) }
}

export function buildMonthly(date: string, byDay: Record<string, number>, goal: number, tol: number, today: string) {
  const first = monthStart(date)
  const n = daysInMonth(date)
  const days = Array.from({ length: n }, (_, i) => dayPoint(addDaysISO(first, i), byDay, goal, tol, today))

  // 7 minggu Senin–Minggu yang berakhir di minggu yang memuat tanggal terakhir bulan itu.
  const lastWeekStart = weekStart(monthEnd(date))
  const weeks: WeekPoint[] = Array.from({ length: 7 }, (_, i) => {
    const start = addDaysISO(lastWeekStart, (i - 6) * 7)
    const isFuture = start > today
    const isCurrent = !isFuture && today <= addDaysISO(start, 6)
    let kcal = 0
    if (!isFuture) for (let d = 0; d < 7; d++) { const day = addDaysISO(start, d); if (day <= today) kcal += byDay[day] ?? 0 }
    return { start, kcal, isCurrent, isFuture, status: isFuture ? 'future' : intakeStatus(kcal, goal * 7, tol) }
  })
  return { start: first, end: monthEnd(date), daysInMonth: n, days, weeks, ...summarize(days, goal * n) }
}

/** Selisih rata-rata terbakar − asupan. ≥ 0 → "di bawah rata-rata", < 0 → "di atas rata-rata". */
export function burnInsight(burnKcal: number, intakeKcal: number) {
  const diff = burnKcal - intakeKcal
  return { diff: Math.abs(diff), direction: diff >= 0 ? 'below' as const : 'above' as const }
}

/** Makro "sesuai" bila |Σ(gram × kkal/g) − target| ≤ maks(50, tolPct% × target). */
export function macroMatches(proteinG: number, carbsG: number, fatG: number, targetKcal: number, tolPct: number) {
  const total = proteinG * 4 + carbsG * 4 + fatG * 9
  return { total, diff: total - targetKcal, ok: Math.abs(total - targetKcal) <= Math.max(50, targetKcal * tolPct / 100) }
}
