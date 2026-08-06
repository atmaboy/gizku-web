'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Dialog from '@/components/ui/Dialog'
import { IconMeal, IconTrash, IconLightbulb } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { pickLocalizedText } from '@/lib/i18n/localizedAnalysis'

type Dish = { name: string; portion: string; calories: number; protein: number; carbs: number; fat: number }
type Meal = {
  id: string
  dishNames: string[]
  totalCalories: number
  totalProtein: string
  totalCarbs: string
  totalFat: string
  imageUrl?: string | null
  loggedAt: string
  source?: string
  rawAnalysis?: { dishes: Dish[]; total: Record<string, unknown>; notes?: string; notesEn?: string }
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}

export default function RiwayatDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t, language } = useTranslation()
  const [meal, setMeal] = useState<Meal | null | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(`nl_riwayat_detail_${params.id}`)
    if (!raw) { router.replace('/main/riwayat'); return }
    try {
      setMeal(JSON.parse(raw))
    } catch {
      router.replace('/main/riwayat')
    }
  }, [params.id, router])

  async function handleDelete() {
    if (!meal) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/history?id=${meal.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) { toast.error(t('riwayatDetail.errors.deleteFailed')); return }
      sessionStorage.removeItem(`nl_riwayat_detail_${meal.id}`)
      toast.success(t('riwayatDetail.deleteSuccess'))
      router.replace('/main/riwayat')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (meal === undefined) return null
  if (meal === null) return null

  const macros = [
    { val: meal.totalCalories, label: t('riwayat.kcal'), color: 'var(--color-kcal)' },
    { val: `${parseFloat(meal.totalProtein).toFixed(1)}g`, label: t('riwayat.protein'), color: 'var(--color-protein)' },
    { val: `${parseFloat(meal.totalCarbs).toFixed(1)}g`, label: t('riwayat.carbs'), color: 'var(--color-carbs)' },
    { val: `${parseFloat(meal.totalFat).toFixed(1)}g`, label: t('riwayat.fat'), color: 'var(--color-fat)' },
  ]

  const localizedNotes = pickLocalizedText(meal.rawAnalysis?.notes, meal.rawAnalysis?.notesEn, language)

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('riwayatDetail.title')} onBack={() => router.back()} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        <div className="w-full rounded-2xl bg-sunken flex items-center justify-center mb-[18px] overflow-hidden" style={{ height: 220 }}>
          {meal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meal.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <IconMeal size={40} color="var(--color-text-tertiary)" />
          )}
        </div>

        <div className="text-xl font-semibold text-primary leading-tight mb-4">
          {meal.dishNames.length > 0 ? meal.dishNames.join(', ') : t('riwayatDetail.unnamedMeal')}
        </div>

        <div className="flex gap-2 mb-5">
          {macros.map(m => (
            <div key={m.label} className="flex-1 bg-surface shadow-hairline rounded-lg py-3.5 px-2 flex flex-col items-center gap-1">
              <span className="text-lg font-semibold" style={{ color: m.color }}>{m.val}</span>
              <span className="text-2xs text-secondary">{m.label}</span>
            </div>
          ))}
        </div>

        {meal.rawAnalysis?.dishes && meal.rawAnalysis.dishes.length > 0 && (
          <>
            <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2.5">{t('riwayatDetail.detectedMenu')}</div>
            {meal.rawAnalysis.dishes.map((dish, i) => (
              <div key={i} className="bg-surface shadow-hairline rounded-lg px-3.5 py-3 mb-2">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-primary">{dish.name}</div>
                    <div className="text-xs text-secondary mt-0.5">{dish.portion}</div>
                  </div>
                  <div className="text-base font-semibold whitespace-nowrap" style={{ color: 'var(--color-kcal)' }}>{dish.calories} {t('riwayat.kkalLabel')}</div>
                </div>
                <div className="flex gap-3.5 mt-2">
                  <span className="text-xs" style={{ color: 'var(--color-protein)' }}>{t('common.proteinAbbr')}: {dish.protein}g</span>
                  <span className="text-xs" style={{ color: 'var(--color-carbs)' }}>{t('common.carbsAbbr')}: {dish.carbs}g</span>
                  <span className="text-xs" style={{ color: 'var(--color-fat)' }}>{t('common.fatAbbr')}: {dish.fat}g</span>
                </div>
              </div>
            ))}
          </>
        )}

        {localizedNotes && (
          <div className="flex gap-2.5 bg-muted rounded-md px-3.5 py-3 my-3.5 mb-[22px]">
            <IconLightbulb size={16} color="var(--color-text-brand)" className="shrink-0 mt-0.5" />
            <span className="text-sm text-secondary leading-normal">{localizedNotes}</span>
          </div>
        )}

        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-surface cursor-pointer"
          style={{ height: 52, boxShadow: 'inset 0 0 0 1.5px var(--color-danger)' }}
        >
          <IconTrash size={16} color="var(--color-danger)" />
          <span className="text-md font-semibold" style={{ color: 'var(--color-danger)' }}>{t('riwayatDetail.deleteThis')}</span>
        </button>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('riwayatDetail.confirmDeleteTitle')}
        description={t('riwayatDetail.confirmDeleteDesc')}
        actions={[
          { label: deleting ? t('riwayatDetail.deleting') : t('riwayatDetail.deleteConfirm'), variant: 'danger-outline', onClick: handleDelete, loading: deleting },
          { label: t('common.cancel'), variant: 'outline', onClick: () => setConfirmDelete(false) },
        ]}
      />
    </div>
  )
}
