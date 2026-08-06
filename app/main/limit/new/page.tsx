'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import TextField from '@/components/ui/TextField'
import { IconCheck, IconInfo, IconBank, IconUpload } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type Tier = { id: string; label: string; addPerDay: number; price: number; totalPerDay: number; eligible: boolean }
type Bank = { bankName: string; accountNumber: string; accountHolder: string }
type Reserved = {
  tierId: string; tierLabel: string; addPerDay: number; totalPerDay: number
  price: number; uniqueCode: number; totalTransfer: number
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}
function fmtRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const maxW = 1000
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function NewLimitRequestPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const prefillTierId = searchParams.get('tierId')
  const fileRef = useRef<HTMLInputElement>(null)

  const [loadingConfig, setLoadingConfig] = useState(true)
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [bank, setBank] = useState<Bank | null>(null)
  const [currentEffectiveLimit, setCurrentEffectiveLimit] = useState<number>(0)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [reserved, setReserved] = useState<Reserved | null>(null)
  const [reserving, setReserving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [proofImageUrl, setProofImageUrl] = useState('')
  const [senderAccountHolder, setSenderAccountHolder] = useState('')
  const [senderAccountNumber, setSenderAccountNumber] = useState('')
  const [senderBankName, setSenderBankName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/limit?action=config', { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.json()
      })
      .then(data => {
        if (!data || cancelled) return
        setFeatureEnabled(data.featureEnabled ?? false)
        setTiers(Array.isArray(data.tiers) ? data.tiers : [])
        setBank(data.bank ?? null)
        setCurrentEffectiveLimit(data.currentEffectiveLimit ?? 0)
        if (prefillTierId && data.tiers?.some((t: Tier) => t.id === prefillTierId && t.eligible)) {
          setSelectedTierId(prefillTierId)
        }
      })
      .finally(() => { if (!cancelled) setLoadingConfig(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function reserveCode(tierId: string) {
    setReserving(true)
    try {
      const res = await fetch('/api/limit?action=reserve_code', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reserve_code', tierId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? t('limitForm.errors.reserveFailed')); setStep(1); return }
      setReserved(data)
    } catch {
      toast.error(t('common.connectFailed'))
      setStep(1)
    } finally {
      setReserving(false)
    }
  }

  function goToStep2() {
    if (!selectedTierId) return
    if (!reserved || reserved.tierId !== selectedTierId) {
      reserveCode(selectedTierId)
    }
    setStep(2)
  }

  function copyAccountNumber() {
    if (!bank) return
    navigator.clipboard.writeText(bank.accountNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  async function handleFile(file: File) {
    const dataUrl = await compressImage(file)
    setProofImageUrl(dataUrl)
  }

  async function submitRequest() {
    if (!reserved || !proofImageUrl || !senderAccountHolder.trim() || !senderAccountNumber.trim() || !senderBankName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/limit?action=submit_request', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_request',
          tierId: reserved.tierId,
          uniqueCode: reserved.uniqueCode,
          proofImageUrl,
          senderAccountHolder: senderAccountHolder.trim(),
          senderAccountNumber: senderAccountNumber.trim(),
          senderBankName: senderBankName.trim(),
          note: note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 409 && data.error === 'code_taken') {
        setReserved(r => r ? { ...r, uniqueCode: data.data.uniqueCode, totalTransfer: data.data.totalTransfer } : r)
        toast.error(t('limitForm.errors.codeTaken'))
        setStep(2)
        return
      }
      if (!res.ok) { toast.error(data.error ?? t('limitForm.errors.submitFailed')); return }
      toast.success(t('limitForm.submitSuccess'))
      router.replace('/main/limit')
    } catch {
      toast.error(t('common.connectFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    if (step === 1) { router.back(); return }
    setStep(prev => (prev - 1) as 1 | 2)
  }

  if (loadingConfig) {
    return (
      <div className="flex flex-col min-h-0 flex-1">
        <ScreenHeader title={t('limitForm.title')} onBack={() => router.back()} />
        <div className="flex-1 px-4 pt-4">
          <div className="gizku-skeleton h-20 mb-3" />
          <div className="gizku-skeleton h-20 mb-3" />
          <div className="gizku-skeleton h-20" />
        </div>
      </div>
    )
  }

  if (!featureEnabled) {
    return (
      <div className="flex flex-col min-h-0 flex-1">
        <ScreenHeader title={t('limitForm.title')} onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-secondary">
          {t('limitForm.notAvailable')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader
        title={step === 1 ? t('limitForm.stepPilih') : step === 2 ? t('limitForm.stepTransfer') : t('limitForm.stepUpload')}
        onBack={handleBack}
      />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-28">
        {step === 1 && (
          <>
            <div className="text-sm text-secondary leading-normal mb-4">
              {t('limitForm.introText')}
            </div>
            <div className="flex flex-col gap-2.5">
              {tiers.map(tier => {
                const selected = selectedTierId === tier.id
                const disabled = !tier.eligible
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => { if (!tier.eligible) return; setSelectedTierId(tier.id) }}
                    disabled={disabled}
                    aria-disabled={disabled}
                    className={`w-full text-left rounded-lg p-4 flex items-center gap-3 transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    style={{
                      border: `2px solid ${selected ? 'var(--color-border-brand)' : 'var(--color-border-default)'}`,
                      background: disabled ? 'var(--color-bg-muted)' : selected ? 'var(--color-bg-brand-tint)' : 'var(--color-bg-surface)',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: `2px solid ${selected ? 'var(--color-border-brand)' : 'var(--color-border-strong)'}`,
                        background: selected ? 'var(--color-bg-brand)' : 'transparent',
                      }}
                    >
                      {selected && <IconCheck size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-base font-semibold ${disabled ? 'text-secondary' : 'text-primary'}`}>
                        {t('limitForm.tierTitle', { label: tier.label, add: tier.addPerDay, total: tier.totalPerDay })}
                      </div>
                      <div className="text-sm text-secondary mt-0.5">
                        {t('limitForm.tierSubtitle', { price: fmtRupiah(tier.price) })}
                      </div>
                      {disabled && (
                        <div className="text-xs text-secondary mt-1">
                          {t('limitForm.tierDisabled', { limit: currentEffectiveLimit })}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {(reserving || !reserved) ? (
              <div className="flex flex-col gap-3">
                <div className="gizku-skeleton h-20" />
                <div className="gizku-skeleton h-40" />
              </div>
            ) : (
              <>
                <div className="rounded-lg px-4 py-3.5 mb-4" style={{ background: 'var(--color-bg-brand-tint)' }}>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-brand)' }}>
                    {t('limitForm.summaryStripTitle', { label: reserved.tierLabel, total: reserved.totalPerDay })}
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-brand)' }}>
                    Rp {fmtRupiah(reserved.totalTransfer)}
                  </div>
                </div>

                <div className="flex gap-2.5 bg-muted rounded-md px-3.5 py-3 mb-4">
                  <IconInfo size={16} color="var(--color-text-secondary)" className="shrink-0 mt-0.5" />
                  <span className="text-sm text-secondary leading-normal">
                    {t('limitForm.transferNotePrefix')} <b className="text-primary">{t('limitForm.transferNoteBold', { code: reserved.uniqueCode })}</b> {t('limitForm.transferNoteSuffix')}
                  </span>
                </div>

                <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <IconBank size={16} color="var(--color-text-brand)" />
                    <div className="text-sm font-semibold text-primary">{t('limitForm.bankDetailsTitle')}</div>
                  </div>
                  <div className="mb-2.5">
                    <div className="text-2xs text-secondary uppercase tracking-[0.5px] mb-0.5">{t('limitForm.bankLabel')}</div>
                    <div className="text-base font-medium text-primary">{bank?.bankName || '-'}</div>
                  </div>
                  <div className="mb-2.5">
                    <div className="text-2xs text-secondary uppercase tracking-[0.5px] mb-0.5">{t('limitForm.accountNumberLabel')}</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base font-semibold text-primary tabular-nums">{bank?.accountNumber || '-'}</div>
                      <button
                        type="button"
                        onClick={copyAccountNumber}
                        className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-sm cursor-pointer"
                        style={{ background: 'var(--color-bg-brand-tint)', color: 'var(--color-text-brand)' }}
                      >
                        {copied ? t('limitForm.copied') : t('limitForm.copy')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-secondary uppercase tracking-[0.5px] mb-0.5">{t('limitForm.accountHolderLabel')}</div>
                    <div className="text-base font-medium text-primary">{bank?.accountHolder || '-'}</div>
                  </div>
                </div>

                <div className="text-xs text-secondary leading-normal">
                  {t('limitForm.closingNote')}
                </div>
              </>
            )}
          </>
        )}

        {step === 3 && reserved && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md bg-sunken shadow-hairline flex items-center justify-center overflow-hidden cursor-pointer mb-2"
              style={{ height: 150 }}
            >
              {proofImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proofImageUrl} alt={t('limitForm.uploadProof')} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-secondary">
                  <IconUpload size={22} color="var(--color-text-secondary)" />
                  <span className="text-sm font-medium">{t('limitForm.uploadProof')}</span>
                </div>
              )}
            </button>
            <div className="text-xs text-secondary leading-normal mb-4">
              {t('limitForm.uploadCaption', { amount: fmtRupiah(reserved.totalTransfer) })}
            </div>

            <TextField
              label={t('limitForm.senderBankLabel')}
              placeholder={t('limitForm.senderBankPlaceholder')}
              value={senderBankName}
              onChange={e => setSenderBankName(e.target.value)}
            />
            <TextField
              label={t('limitForm.senderNameLabel')}
              placeholder={t('limitForm.senderNamePlaceholder')}
              value={senderAccountHolder}
              onChange={e => setSenderAccountHolder(e.target.value)}
            />
            <TextField
              label={t('limitForm.senderAccountLabel')}
              placeholder={t('limitForm.senderAccountPlaceholder')}
              value={senderAccountNumber}
              onChange={e => setSenderAccountNumber(e.target.value)}
            />
            <div className="text-xs text-secondary leading-normal mb-4 -mt-1.5">
              {t('limitForm.senderAccountCaption')}
            </div>

            <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-1.5">{t('limitForm.noteLabel')}</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('limitForm.notePlaceholder')}
              rows={3}
              className="w-full box-border rounded-md bg-sunken shadow-hairline border-none outline-none px-3 py-2.5 text-base text-primary resize-none"
            />
          </>
        )}
      </div>

      {/* Sticky footer */}
      <div
        className="sticky bottom-0 bg-surface border-t px-4 py-3"
        style={{ borderColor: 'var(--color-border-default)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        {step === 1 && (
          <Button onClick={goToStep2} disabled={!selectedTierId}>{t('limitForm.next')}</Button>
        )}
        {step === 2 && (
          <Button onClick={() => setStep(3)} disabled={!reserved || reserving}>{t('limitForm.alreadyTransferred')}</Button>
        )}
        {step === 3 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-2xs text-secondary">{t('limitForm.totalTransfer')}</div>
              <div className="text-lg font-bold text-primary truncate">Rp {fmtRupiah(reserved?.totalTransfer ?? 0)}</div>
            </div>
            <Button
              fullWidth={false}
              className="shrink-0"
              onClick={submitRequest}
              loading={submitting}
              disabled={!proofImageUrl || !senderAccountHolder.trim() || !senderAccountNumber.trim() || !senderBankName.trim()}
            >
              {t('limitForm.sendRequest')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
