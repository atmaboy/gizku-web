'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import { IconHistory } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { ledgerRowTitle } from '@/lib/limitFormat'
import type { LedgerTitleKey, LedgerTitleParams } from '@/lib/limitLedger'

type LedgerRowType = 'usage' | 'tier-approved-reset' | 'expiry-reset' | 'daily-reset'
type LedgerRow = {
  date: string
  type: LedgerRowType
  title: string
  titleKey?: LedgerTitleKey
  titleParams?: LedgerTitleParams
  before: number
  after: number
  delta: number
}

const BADGE_COLOR: Record<LedgerRowType, string> = {
  usage: 'var(--color-text-secondary)',
  'tier-approved-reset': 'var(--color-success)',
  'expiry-reset': 'var(--color-warning)',
  'daily-reset': 'var(--color-text-tertiary)',
}
const BADGE_BG: Record<LedgerRowType, string> = {
  usage: 'var(--color-bg-muted)',
  'tier-approved-reset': 'var(--color-bg-brand-tint)',
  'expiry-reset': 'rgba(217,155,63,0.12)',
  'daily-reset': 'var(--color-bg-muted)',
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}
function fmtDate(dateStr: string, locale: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function LimitLedgerPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)

  const BADGE_LABEL: Record<LedgerRowType, string> = {
    usage: t('limitFormat.typeUsage'),
    'tier-approved-reset': t('limitFormat.typeApproved'),
    'expiry-reset': t('limitFormat.typeExpired'),
    'daily-reset': t('limitFormat.typeDailyReset'),
  }

  function loadLedger(p: number) {
    setLoading(true)
    fetch(`/api/limit?action=ledger&page=${p}&pageSize=10`, { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setBalance(data.balance ?? 0)
        setRows(Array.isArray(data.rows) ? data.rows : [])
        setPage(data.page ?? p)
        setPageCount(data.pageCount ?? 1)
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadLedger(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('limitHistory.title')} onBack={() => router.back()} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        <div className="rounded-lg bg-brand-tint px-4 py-4 mb-4">
          <div className="text-xs font-medium" style={{ color: 'var(--color-text-brand)' }}>{t('limitHistory.currentBalance')}</div>
          {loading ? (
            <div className="gizku-skeleton h-8 w-24 mt-1.5" />
          ) : (
            <div className="text-3xl font-bold mt-0.5" style={{ color: 'var(--color-text-brand)' }}>
              {balance} <span className="text-base font-semibold">{t('limitHistory.perDay')}</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4].map(i => <div key={i} className="gizku-skeleton h-16" />)}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 px-6 gap-2">
            <IconHistory size={40} color="var(--color-text-tertiary)" strokeWidth={1.5} />
            <div className="text-lg font-semibold text-primary">{t('limitHistory.emptyTitle')}</div>
            <div className="text-sm text-secondary leading-normal max-w-[260px]">
              {t('limitHistory.emptyBody')}
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <Card className="overflow-hidden">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--color-border-default)' : 'none' }}
                >
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-flex items-center rounded-pill px-2 py-0.5 text-2xs font-semibold mb-1"
                      style={{ background: BADGE_BG[row.type], color: BADGE_COLOR[row.type] }}
                    >
                      {BADGE_LABEL[row.type]}
                    </span>
                    <div className="text-sm font-medium text-primary truncate">{ledgerRowTitle(row, t)}</div>
                    <div className="text-xs text-secondary mt-0.5">{fmtDate(row.date, locale)} · {row.after}/{t('limitHistory.perDay')}</div>
                  </div>
                  <div
                    className="text-base font-semibold whitespace-nowrap shrink-0"
                    style={{ color: row.delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                  >
                    {row.delta >= 0 ? `+${row.delta}` : row.delta}
                  </div>
                </div>
              ))}
            </Card>

            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-xs text-secondary tabular-nums">{t('limitHistory.pageInfo', { page, pageCount, total })}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => loadLedger(page - 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-secondary shadow-hairline-strong transition disabled:opacity-40"
                >
                  {t('limitHistory.prevPage')}
                </button>
                <button
                  disabled={page >= pageCount}
                  onClick={() => loadLedger(page + 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-secondary shadow-hairline-strong transition disabled:opacity-40"
                >
                  {t('limitHistory.nextPage')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
