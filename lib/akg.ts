/**
 * Rata-rata kebutuhan energi per hari menurut AKG Kemenkes 2019 (PMK No. 28 Tahun 2019), dipakai untuk kartu
 * "Rata-rata kalori terbakar" di Statistik. Dihitung di server supaya app dan backoffice konsisten.
 */
import { todayISO } from '@/lib/utils'

export type Gender = 'm' | 'f'

/** Batas bawah kelompok umur → [laki-laki, perempuan] kkal/hari. */
const AKG: { from: number; to: number | null; label: string; m: number; f: number }[] = [
  { from: 10, to: 12,   label: '10–12', m: 2000, f: 1900 },
  { from: 13, to: 15,   label: '13–15', m: 2400, f: 2050 },
  { from: 16, to: 18,   label: '16–18', m: 2650, f: 2100 },
  { from: 19, to: 29,   label: '19–29', m: 2650, f: 2250 },
  { from: 30, to: 49,   label: '30–49', m: 2550, f: 2150 },
  { from: 50, to: 64,   label: '50–64', m: 2150, f: 1800 },
  { from: 65, to: 80,   label: '65–80', m: 1800, f: 1550 },
  { from: 81, to: null, label: '80+',   m: 1600, f: 1400 },
]

export const MIN_AGE = 10
export const MAX_AGE = 120

export type Burn = { kcal: number; group: string; gender: Gender; age: number }

/** Umur penuh pada tanggal `onDate` (YYYY-MM-DD, WIB). Null bila `birthDate` bukan tanggal valid atau di masa depan. */
export function ageOn(birthDate: string, onDate: string = todayISO()): number | null {
  if (!isValidISODate(birthDate) || !isValidISODate(onDate)) return null
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = onDate.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age--
  return age < 0 ? null : age
}

/** True untuk "YYYY-MM-DD" yang benar-benar ada di kalender (menolak 2026-02-31). */
export function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00.000Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function akgFor(gender: Gender, age: number): { kcal: number; group: string } | null {
  if (age < MIN_AGE || age > MAX_AGE) return null
  const row = AKG.find(r => age >= r.from && (r.to === null || age <= r.to))
  return row ? { kcal: gender === 'm' ? row.m : row.f, group: row.label } : null
}

/** Rata-rata kalori terbakar dari profil user, atau null bila gender/tanggal lahir belum valid. */
export function burnFor(gender: string | null | undefined, birthDate: string | null | undefined, onDate?: string): Burn | null {
  if ((gender !== 'm' && gender !== 'f') || !birthDate) return null
  const age = ageOn(birthDate, onDate)
  if (age === null) return null
  const akg = akgFor(gender, age)
  return akg ? { kcal: akg.kcal, group: akg.group, gender, age } : null
}

/** Pesan error untuk input profil (sama dengan copy di app), atau null bila valid. */
export function validateProfile(gender: unknown, birthDate: unknown, onDate?: string): string | null {
  if (gender !== 'm' && gender !== 'f') return 'Pilih gender dulu.'
  if (birthDate === undefined || birthDate === null || birthDate === '') return 'Isi tanggal lahir dulu.'
  if (!isValidISODate(birthDate)) return 'Tanggal belum lengkap.'
  const age = ageOn(birthDate, onDate)
  if (age === null || age < MIN_AGE) return 'Statistik ini untuk usia 10 tahun ke atas.'
  if (age > MAX_AGE) return 'Cek lagi tahun lahirmu.'
  return null
}
