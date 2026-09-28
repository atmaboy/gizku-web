/**
 * Automatic-stat helpers that are safe on the client (builder preview) and
 * the server. Counting itself lives in metrics.ts (DB).
 */
import { formatStat } from './format'
import type { LandingContent, StatMetric } from './schema'

export type MetricValues = Record<StatMetric, number>

export const METRIC_LABELS: Record<StatMetric, { label: string; hint: string }> = {
  users_active: { label: 'Jumlah user terdaftar (aktif)', hint: 'akun berstatus aktif' },
  users_login_30d: { label: 'User login 30 hari terakhir', hint: 'last_login_at ≤ 30 hari' },
  meals_total: { label: 'Total makanan tercatat', hint: 'total analisa tersimpan' },
}


/** Return a copy with every `auto` stat's resolvedValue filled from `values`. */
export function applyMetrics(c: LandingContent, values: MetricValues): LandingContent {
  return {
    ...c,
    stats: {
      ...c.stats,
      items: c.stats.items.map(it => it.source === 'auto' && it.metric
        ? { ...it, resolvedValue: formatStat(values[it.metric], it.format) }
        : { ...it, resolvedValue: it.source === 'auto' ? it.resolvedValue : null }),
    },
  }
}
