'use client'

import { useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import { IconGlobe, IconCheck } from '@/components/ui/icons'
import { useTranslation, type Language } from '@/lib/i18n/LanguageContext'

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
]

export default function LanguagePage() {
  const router = useRouter()
  const { language, setLanguage, t } = useTranslation()

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('language.screenTitle')} onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        <div className="text-sm text-secondary leading-normal mb-4">{t('language.screenSubtitle')}</div>

        <Card className="overflow-hidden">
          {OPTIONS.map((opt, i) => {
            const selected = language === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => setLanguage(opt.value)}
                role="button"
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                style={{ borderBottom: i < OPTIONS.length - 1 ? '1px solid var(--color-border-default)' : 'none' }}
              >
                <IconGlobe size={18} color={selected ? 'var(--color-text-brand)' : 'var(--color-text-secondary)'} />
                <span
                  className="flex-1 text-md"
                  style={{ color: selected ? 'var(--color-text-brand)' : 'var(--color-text-primary)', fontWeight: selected ? 600 : 400 }}
                >
                  {opt.label}
                </span>
                {selected && <IconCheck size={16} color="var(--color-text-brand)" strokeWidth={2.5} />}
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
