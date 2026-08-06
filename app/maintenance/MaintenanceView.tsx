'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { IconWrench, IconCheck } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

export default function MaintenanceView({ title, description }: { title: string; description: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  function retry() {
    setChecking(true)
    setTimeout(() => {
      router.push('/login')
    }, 600)
  }

  return (
    <div className="min-h-dvh bg-page flex flex-col items-center px-5" style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', paddingBottom: 32 }}>
      <div className="mb-[22px]">
        <span className="text-lg font-semibold text-primary tracking-tight">Gizku</span>
      </div>

      <div className="w-full max-w-[380px] bg-surface rounded-2xl p-6 box-border" style={{ boxShadow: 'var(--shadow-hairline), var(--shadow-sm)' }}>
        <div className="flex flex-col items-center text-center gap-4 mb-[18px]">
          <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center" style={{ color: 'var(--color-text-brand)' }}>
            <IconWrench size={24} />
          </div>
          <div className="text-xl font-semibold text-primary leading-tight">{title}</div>
          <div className="text-sm text-secondary leading-normal">{description}</div>
        </div>

        <div className="pt-3.5 mb-[18px]" style={{ borderTop: '1px solid var(--color-border-default)' }}>
          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2.5">{t('maintenance.improvingLabel')}</div>
          {[t('maintenance.improve1'), t('maintenance.improve2')].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 mb-2.5 last:mb-0">
              <div className="w-5 h-5 rounded-full bg-brand-tint flex items-center justify-center shrink-0" style={{ color: 'var(--color-text-brand)' }}>
                <IconCheck size={11} />
              </div>
              <span className="text-sm text-secondary leading-normal">{item}</span>
            </div>
          ))}
        </div>

        <Button loading={checking} onClick={retry}>{t('maintenance.retry')}</Button>
      </div>

      <button onClick={() => setContactOpen(true)} className="text-sm font-medium text-link cursor-pointer mt-[18px]">
        {t('maintenance.needHelp')}
      </button>
      <div className="text-2xs text-tertiary mt-5">{t('maintenance.footer')}</div>

      <Dialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={t('maintenance.needHelpTitle')}
        description={t('maintenance.needHelpDesc')}
        actions={[{ label: t('maintenance.closeButton'), variant: 'primary', onClick: () => setContactOpen(false) }]}
      />
    </div>
  )
}
