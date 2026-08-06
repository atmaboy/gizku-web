'use client'

import { IconArrowLeft } from './icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

export default function ScreenHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="flex items-center gap-2.5 px-4 pb-3 border-b sticky top-0 z-10 bg-surface"
      style={{
        borderColor: 'var(--color-border-default)',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
      }}
    >
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 cursor-pointer text-primary"
        aria-label={t('screenHeader.back')}
      >
        <IconArrowLeft size={16} />
      </button>
      <div className="flex-1 text-center text-lg font-semibold text-primary truncate">{title}</div>
      <div className="w-9 shrink-0" />
    </div>
  )
}
