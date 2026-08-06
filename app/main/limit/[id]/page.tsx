'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import { IconClock, IconCheck, IconClose } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type RequestDetail = {
  id: string
  tierId: string | null
  tierLabel: string
  addPerDay: number
  totalPerDay: number
  price: number
  uniqueCode: number
  totalTransfer: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  decidedAt: string | null
  proofImageUrl: string
  senderAccountHolder: string | null
  senderAccountNumber: string | null
  senderBankName: string | null
  note: string | null
  rejectReason: string | null
  rejectNote: string | null
  expiresAt?: string
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}
function fmtDateTime(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

export default function LimitRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t, language } = useTranslation()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  const [detail, setDetail] = useState<RequestDetail | null | undefined>(undefined)

  const STATUS_META = {
    pending:  { label: t('limitFormat.statusPending'),  color: 'var(--color-warning)', bg: 'rgba(217,155,63,0.12)', icon: IconClock },
    approved: { label: t('limitFormat.statusApproved'), color: 'var(--color-success)', bg: 'var(--color-bg-brand-tint)', icon: IconCheck },
    rejected: { label: t('limitFormat.statusRejected'), color: 'var(--color-danger)',  bg: 'rgba(194,91,88,0.1)', icon: IconClose },
  } as const

  useEffect(() => {
    let cancelled = false
    fetch(`/api/limit?action=request&id=${params.id}`, { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        if (!res.ok) return null
        return res.json()
      })
      .then(data => { if (!cancelled) setDetail(data ?? null) })
    return () => { cancelled = true }
  }, [params.id, router])

  if (detail === undefined) return null
  if (detail === null) {
    return (
      <div className="flex flex-col min-h-0 flex-1">
        <ScreenHeader title={t('limitDetail.title')} onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center text-sm text-secondary">{t('limitDetail.notFound')}</div>
      </div>
    )
  }

  const meta = STATUS_META[detail.status]
  const StatusIcon = meta.icon
  const statusDate = detail.status === 'pending' ? detail.submittedAt : detail.decidedAt

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('limitDetail.title')} onBack={() => router.back()} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        <div className="rounded-lg px-4 py-3.5 mb-4 flex items-center gap-3" style={{ background: meta.bg }}>
          <StatusIcon size={22} color={meta.color} />
          <div className="min-w-0">
            <div className="text-base font-semibold" style={{ color: meta.color }}>{meta.label}</div>
            {statusDate && <div className="text-xs mt-0.5" style={{ color: meta.color }}>{fmtDateTime(statusDate, locale)}</div>}
          </div>
        </div>

        <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">{t('limitDetail.rowPackage')}</span>
            <span className="font-medium text-primary text-right">{detail.tierLabel}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">{t('limitDetail.rowTotalPerDay')}</span>
            <span className="font-medium text-primary text-right">{t('limitDetail.rowTotalPerDayValue', { count: detail.totalPerDay })}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">{t('limitDetail.rowTransferAmount')}</span>
            <span className="font-medium text-primary text-right">{t('limitDetail.rowTransferAmountValue', { amount: fmtRupiah(detail.totalTransfer), code: detail.uniqueCode })}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">{t('limitDetail.rowValidity')}</span>
            <span className="font-medium text-primary text-right">{t('limitDetail.rowValidityValue')}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">{t('limitDetail.rowSubmittedDate')}</span>
            <span className="font-medium text-primary text-right">{fmtDateTime(detail.submittedAt, locale)}</span>
          </div>
          {detail.note && (
            <div className="mt-2 pt-2.5 text-sm text-secondary italic" style={{ borderTop: '1px solid var(--color-border-default)' }}>
              &ldquo;{detail.note}&rdquo;
            </div>
          )}
        </div>

        {(detail.senderAccountHolder || detail.senderAccountNumber || detail.senderBankName) && (
          <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
            {detail.senderBankName && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-secondary">{t('limitDetail.rowSenderBank')}</span>
                <span className="font-medium text-primary text-right">{detail.senderBankName}</span>
              </div>
            )}
            {detail.senderAccountHolder && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-secondary">{t('limitDetail.rowSenderName')}</span>
                <span className="font-medium text-primary text-right">{detail.senderAccountHolder}</span>
              </div>
            )}
            {detail.senderAccountNumber && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-secondary">{t('limitDetail.rowSenderAccount')}</span>
                <span className="font-medium text-primary text-right">{detail.senderAccountNumber}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2.5">{t('limitDetail.proofTitle')}</div>
        <div className="w-full rounded-lg bg-sunken overflow-hidden mb-4" style={{ minHeight: 180 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={detail.proofImageUrl} alt={t('limitDetail.proofTitle')} className="w-full h-auto block" />
        </div>

        {detail.status === 'approved' && (
          <div className="rounded-lg px-4 py-3.5 mb-4" style={{ background: 'var(--color-bg-brand-tint)' }}>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-brand)' }}>{t('limitDetail.approvedTitle')}</div>
            <div className="text-sm" style={{ color: 'var(--color-text-brand)' }}>{t('limitDetail.approvedLimit', { count: detail.totalPerDay })}</div>
            {detail.expiresAt && (
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-brand)' }}>{t('limitDetail.approvedUntil', { date: fmtDate(detail.expiresAt, locale) })}</div>
            )}
          </div>
        )}

        {detail.status === 'rejected' && (
          <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
            <div className="text-sm font-bold text-danger mb-1.5">{detail.rejectReason}</div>
            {detail.rejectNote && <div className="text-sm text-secondary mb-2.5">{detail.rejectNote}</div>}
            <div className="text-xs text-secondary leading-normal mb-3">
              {t('limitDetail.reapplyHint')}
            </div>
            <Button onClick={() => router.push(`/main/limit/new${detail.tierId ? `?tierId=${detail.tierId}` : ''}`)}>
              {t('limitDetail.reapply')}
            </Button>
          </div>
        )}

        {detail.status === 'pending' && (
          <div className="bg-muted rounded-md px-3.5 py-3 text-xs text-secondary leading-normal">
            {t('limitDetail.pendingNote')}
          </div>
        )}
      </div>
    </div>
  )
}
