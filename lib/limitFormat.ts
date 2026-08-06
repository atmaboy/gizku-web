import type { LedgerTitleKey, LedgerTitleParams } from './limitLedger'

type Translate = (key: string, params?: Record<string, string | number>) => string

export function ledgerRowTitle(row: { title: string; titleKey?: LedgerTitleKey; titleParams?: LedgerTitleParams }, t: Translate) {
  switch (row.titleKey) {
    case 'usage': return t('limitFormat.titleUsage')
    case 'daily-reset': return t('limitFormat.titleDailyReset')
    case 'tier-approved': return t('limitFormat.titleTierApproved', { tierLabel: row.titleParams?.tierLabel ?? '', totalPerDay: row.titleParams?.totalPerDay ?? 0 })
    case 'tier-expired': return t('limitFormat.titleTierExpired', { tierLabel: row.titleParams?.tierLabel ?? '' })
    default: return row.title
  }
}
