import { describe, expect, it } from 'vitest'
import { ageOn, akgFor, burnFor, validateProfile } from '@/lib/akg'

describe('akgFor — batas kelompok umur', () => {
  it('12/13', () => { expect(akgFor('f', 12)?.kcal).toBe(1900); expect(akgFor('f', 13)?.kcal).toBe(2050) })
  it('29/30', () => { expect(akgFor('m', 29)?.kcal).toBe(2650); expect(akgFor('m', 30)?.kcal).toBe(2550) })
  it('49/50', () => { expect(akgFor('f', 49)?.kcal).toBe(2150); expect(akgFor('f', 50)?.kcal).toBe(1800) })
  it('80/81', () => {
    expect(akgFor('m', 80)).toEqual({ kcal: 1800, group: '65–80' })
    expect(akgFor('m', 81)).toEqual({ kcal: 1600, group: '80+' })
    expect(akgFor('f', 81)?.kcal).toBe(1400)
  })
  it('di luar 10–120 → null', () => { expect(akgFor('m', 9)).toBeNull(); expect(akgFor('m', 121)).toBeNull() })
})

describe('ageOn', () => {
  it('umur penuh: belum/sudah ulang tahun', () => {
    expect(ageOn('1994-05-17', '2026-05-16')).toBe(31)
    expect(ageOn('1994-05-17', '2026-05-17')).toBe(32)
  })
  it('tanggal tidak valid / masa depan → null', () => {
    expect(ageOn('2026-02-31', '2026-11-13')).toBeNull()
    expect(ageOn('2030-01-01', '2026-11-13')).toBeNull()
  })
})

describe('burnFor', () => {
  it('contoh desain: perempuan 32 tahun → 2.150, kelompok 30–49', () => {
    expect(burnFor('f', '1994-05-17', '2026-11-13')).toEqual({ kcal: 2150, group: '30–49', gender: 'f', age: 32 })
  })
  it('profil belum lengkap → null', () => {
    expect(burnFor(null, '1994-05-17')).toBeNull()
    expect(burnFor('f', null)).toBeNull()
  })
})

describe('validateProfile', () => {
  const today = '2026-11-13'
  it('urutan pesan', () => {
    expect(validateProfile(null, '', today)).toBe('Pilih gender dulu.')
    expect(validateProfile('f', '', today)).toBe('Isi tanggal lahir dulu.')
    expect(validateProfile('f', '1994-13-40', today)).toBe('Tanggal belum lengkap.')
    expect(validateProfile('f', '2020-01-01', today)).toBe('Progres ini untuk usia 10 tahun ke atas.')
    expect(validateProfile('f', '1890-01-01', today)).toBe('Cek lagi tahun lahirmu.')
    expect(validateProfile('m', '1994-05-17', today)).toBeNull()
  })
  it('tepat 10 tahun valid, kurang sehari tidak', () => {
    expect(validateProfile('m', '2016-11-13', today)).toBeNull()
    expect(validateProfile('m', '2016-11-14', today)).not.toBeNull()
  })
})
