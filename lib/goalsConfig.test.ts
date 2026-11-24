import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS_CONFIG, featureAccess, macroGramsFromKcal, mergeGoalsConfig, validateGoalsConfig } from '@/lib/goalsConfig'

describe('mergeGoalsConfig', () => {
  it('kosong → default', () => { expect(mergeGoalsConfig(null)).toEqual(DEFAULT_GOALS_CONFIG); expect(mergeGoalsConfig('x')).toEqual(DEFAULT_GOALS_CONFIG) })
  it('field parsial diisi default, nilai valid dipertahankan', () => {
    const c = mergeGoalsConfig({ enabled: false, features: { weekly: { premium: false } }, target: { defaultKcal: 1800 } })
    expect(c.enabled).toBe(false)
    expect(c.features.weekly).toEqual({ on: true, premium: false })
    expect(c.features.monthly).toEqual({ on: true, premium: true })
    expect(c.target.defaultKcal).toBe(1800)
    expect(c.target.maxKcal).toBe(4000)
  })
  it('tipe rusak jatuh ke default', () => {
    const c = mergeGoalsConfig({ enabled: 'yes', target: { minKcal: 'a', presets: 'x' }, recCountPerTab: 9 })
    expect(c.enabled).toBe(true)
    expect(c.target.minKcal).toBe(1200)
    expect(c.target.presets).toEqual([1600, 1800, 2000, 2200, 2500])
    expect(c.recCountPerTab).toBe(3)
  })
})

describe('validateGoalsConfig', () => {
  const base = () => mergeGoalsConfig({})
  it('default valid', () => expect(validateGoalsConfig(base())).toBeNull())
  it('total makro harus tepat 100', () => {
    const c = base(); c.macroDefault.fatPct = 31
    expect(validateGoalsConfig(c)).toBe('Total pembagian 101%, harus tepat 100% sebelum disimpan.')
  })
  it('min < default < max', () => {
    const c = base(); c.target.defaultKcal = 1200
    expect(validateGoalsConfig(c)).toMatch(/minimum < default < maksimum/)
    const d = base(); d.target.maxKcal = 2000
    expect(validateGoalsConfig(d)).toMatch(/minimum < default < maksimum/)
  })
  it('preset di luar rentang ditolak', () => {
    const c = base(); c.target.presets = [1000, 2000]
    expect(validateGoalsConfig(c)).toMatch(/Pilihan cepat/)
  })
  it('toleransi target hanya 5/10/15', () => {
    const c = base(); c.target.tolerancePct = 7
    expect(validateGoalsConfig(c)).toMatch(/Toleransi/)
  })
})

describe('macroGramsFromKcal', () => {
  it('contoh 2.000 kkal → 100 / 250 / 67 g', () => {
    expect(macroGramsFromKcal(2000, DEFAULT_GOALS_CONFIG.macroDefault)).toEqual({ protein: 100, carbs: 250, fat: 67 })
  })
  it('1.800 kkal → 90 / 225 / 60 g', () => {
    expect(macroGramsFromKcal(1800, DEFAULT_GOALS_CONFIG.macroDefault)).toEqual({ protein: 90, carbs: 225, fat: 60 })
  })
})

describe('featureAccess', () => {
  const c = mergeGoalsConfig({})
  it('gratis: weekly terkunci, daily tidak', () => {
    expect(featureAccess(c, 'daily', false)).toEqual({ on: true, locked: false })
    expect(featureAccess(c, 'weekly', false)).toEqual({ on: true, locked: true })
  })
  it('premium membuka semua; fitur off tidak terkunci', () => {
    expect(featureAccess(c, 'weekly', true).locked).toBe(false)
    expect(featureAccess(c, 'recs', false)).toEqual({ on: false, locked: false })
  })
})
