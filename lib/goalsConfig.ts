/**
 * Config Goals & Tracker (backoffice /admin/goals). Modul ini MURNI (tanpa db) supaya bisa dipakai client dan test;
 * pembacaan/penyimpanan ke admin_config ada di lib/goalsConfig.server.ts.
 */

export const GOALS_CONFIG_KEY = 'goals_tracker_config'

export type FeatureKey = 'daily' | 'weekly' | 'monthly' | 'macro' | 'recs'
export const FEATURE_KEYS: FeatureKey[] = ['daily', 'weekly', 'monthly', 'macro', 'recs']

export type FeatureSetting = { on: boolean; premium: boolean }
export type PremiumCopy = { title: string; body: string }

export type GoalsConfig = {
  enabled: boolean
  allowEdit: boolean
  features: Record<FeatureKey, FeatureSetting>
  target: { defaultKcal: number; minKcal: number; maxKcal: number; tolerancePct: number; presets: number[] }
  macroDefault: { proteinPct: number; carbsPct: number; fatPct: number; tolerancePct: number }
  premiumSale: { mode: 'soon'; copy: { id: PremiumCopy; en: PremiumCopy } }
  recCountPerTab: number
}

export const DEFAULT_GOALS_CONFIG: GoalsConfig = {
  enabled: true,
  allowEdit: true,
  features: {
    daily:   { on: true,  premium: false },
    weekly:  { on: true,  premium: true },
    monthly: { on: true,  premium: true },
    macro:   { on: true,  premium: true },
    recs:    { on: false, premium: true },
  },
  target: { defaultKcal: 2000, minKcal: 1200, maxKcal: 4000, tolerancePct: 10, presets: [1600, 1800, 2000, 2200, 2500] },
  macroDefault: { proteinPct: 20, carbsPct: 50, fatPct: 30, tolerancePct: 5 },
  premiumSale: {
    mode: 'soon',
    copy: {
      id: { title: 'Gizku Premium', body: 'Premium akan dijual satu paket dengan tambahan kuota analisa foto. Paketnya masih kami siapkan.' },
      en: { title: 'Gizku Premium', body: "Premium will be sold as one bundle with extra photo-analysis quota. We're still preparing it." },
    },
  },
  recCountPerTab: 3,
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v : d)

/** Gabungkan JSON mentah dari admin_config dengan default; field hilang/rusak jatuh ke default. */
export function mergeGoalsConfig(raw: unknown): GoalsConfig {
  const d = DEFAULT_GOALS_CONFIG
  const r = isObj(raw) ? raw : {}
  const feats = isObj(r.features) ? r.features : {}
  const features = {} as Record<FeatureKey, FeatureSetting>
  for (const k of FEATURE_KEYS) {
    const f = isObj(feats[k]) ? feats[k] as Record<string, unknown> : {}
    features[k] = { on: bool(f.on, d.features[k].on), premium: bool(f.premium, d.features[k].premium) }
  }
  const t = isObj(r.target) ? r.target : {}
  const presets = Array.isArray(t.presets)
    ? t.presets.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).map(Math.round)
    : d.target.presets
  const m = isObj(r.macroDefault) ? r.macroDefault : {}
  const sale = isObj(r.premiumSale) ? r.premiumSale : {}
  const copy = isObj(sale.copy) ? sale.copy : {}
  const lang = (k: 'id' | 'en'): PremiumCopy => {
    const c = isObj(copy[k]) ? copy[k] as Record<string, unknown> : {}
    return { title: str(c.title, d.premiumSale.copy[k].title), body: str(c.body, d.premiumSale.copy[k].body) }
  }
  return {
    enabled: bool(r.enabled, d.enabled),
    allowEdit: bool(r.allowEdit, d.allowEdit),
    features,
    target: {
      defaultKcal: num(t.defaultKcal, d.target.defaultKcal),
      minKcal: num(t.minKcal, d.target.minKcal),
      maxKcal: num(t.maxKcal, d.target.maxKcal),
      tolerancePct: num(t.tolerancePct, d.target.tolerancePct),
      presets: presets.length ? presets : d.target.presets,
    },
    macroDefault: {
      proteinPct: num(m.proteinPct, d.macroDefault.proteinPct),
      carbsPct: num(m.carbsPct, d.macroDefault.carbsPct),
      fatPct: num(m.fatPct, d.macroDefault.fatPct),
      tolerancePct: num(m.tolerancePct, d.macroDefault.tolerancePct),
    },
    premiumSale: { mode: 'soon', copy: { id: lang('id'), en: lang('en') } },
    recCountPerTab: [2, 3, 4].includes(num(r.recCountPerTab, d.recCountPerTab)) ? num(r.recCountPerTab, d.recCountPerTab) : d.recCountPerTab,
  }
}

/** Pesan error bila config tidak boleh disimpan, atau null. */
export function validateGoalsConfig(c: GoalsConfig): string | null {
  const { proteinPct, carbsPct, fatPct, tolerancePct: macroTol } = c.macroDefault
  const total = proteinPct + carbsPct + fatPct
  if ([proteinPct, carbsPct, fatPct].some(p => p < 0 || !Number.isInteger(p))) return 'Persen makro harus bilangan bulat ≥ 0'
  if (total !== 100) return `Total pembagian ${total}%, harus tepat 100% sebelum disimpan.`
  const { minKcal, defaultKcal, maxKcal, tolerancePct, presets } = c.target
  if (![minKcal, defaultKcal, maxKcal].every(Number.isInteger)) return 'Target kalori harus bilangan bulat'
  if (!(minKcal < defaultKcal && defaultKcal < maxKcal)) return 'Target kalori harus memenuhi minimum < default < maksimum'
  if (minKcal < 500 || maxKcal > 10000) return 'Rentang target kalori harus di antara 500 dan 10.000 kkal'
  if (![5, 10, 15].includes(tolerancePct)) return 'Toleransi target harus 5, 10, atau 15%'
  if (macroTol < 0 || macroTol > 20) return 'Toleransi makro harus di antara 0 dan 20%'
  if (presets.length < 1 || presets.length > 8) return 'Pilihan cepat harus 1–8 angka'
  if (presets.some(p => p < minKcal || p > maxKcal)) return 'Pilihan cepat harus berada di antara minimum dan maksimum'
  if (!c.premiumSale.copy.id.title.trim() || !c.premiumSale.copy.en.title.trim()) return 'Judul sheet Premium wajib diisi'
  if (![2, 3, 4].includes(c.recCountPerTab)) return 'Jumlah kartu rekomendasi harus 2, 3, atau 4'
  return null
}

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const

/** Gram makro dari pembagian persen kalori (contoh 2.000 kkal: 100 / 250 / 67 g). */
export function macroGramsFromKcal(kcal: number, m: Pick<GoalsConfig['macroDefault'], 'proteinPct' | 'carbsPct' | 'fatPct'>) {
  return {
    protein: Math.round((kcal * m.proteinPct / 100) / KCAL_PER_G.protein),
    carbs:   Math.round((kcal * m.carbsPct   / 100) / KCAL_PER_G.carbs),
    fat:     Math.round((kcal * m.fatPct     / 100) / KCAL_PER_G.fat),
  }
}

/** Akses user ke sebuah fitur: `on` = tampil, `locked` = tampil tapi terkunci (butuh Premium). */
export function featureAccess(cfg: GoalsConfig, key: FeatureKey, isPremium: boolean) {
  const f = cfg.features[key]
  return { on: f.on, locked: f.on && f.premium && !isPremium }
}
