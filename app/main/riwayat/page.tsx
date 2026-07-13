'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import { IconCalendar, IconChevronRight, IconChevronDown, IconMeal } from '@/components/ui/icons'
import { useCapture, MEAL_SAVED_EVENT } from '@/components/capture/CaptureContext'

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
  rawAnalysis?: { dishes: Dish[]; total: Record<string, unknown>; notes?: string; healthScore?: number; assessment?: string }
}
type HistoryData = { meals: Meal[]; total: number; page: number; totalPages: number }

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateStr(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function todayStr() {
  // Local calendar date, not UTC — toISOString() would shift the day for
  // timezones ahead of UTC (e.g. WIB) around midnight.
  return localDateStr(new Date())
}

function SourceBadge({ source }: { source?: string }) {
  const isTelegram = source === 'telegram'
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-pill text-2xs font-semibold"
      style={{
        background: isTelegram ? 'rgba(38,165,228,0.1)' : 'var(--color-bg-muted)',
        color: isTelegram ? 'var(--tg-blue)' : 'var(--color-text-secondary)',
      }}
    >
      {isTelegram ? 'Telegram' : 'Web'}
    </span>
  )
}

function NutritionSummary({ label, kcal, protein, carbs, fat }: { label: string; kcal: number; protein: string; carbs: string; fat: string }) {
  return (
    <Card className="p-4 mb-4">
      <div className="text-base font-semibold text-primary mb-3.5">Ringkasan Nutrisi, {label}</div>
      <div className="flex justify-between gap-2">
        {[
          { val: kcal, label: 'Kalori', color: 'var(--color-kcal)' },
          { val: `${protein}g`, label: 'Protein', color: 'var(--color-protein)' },
          { val: `${carbs}g`, label: 'Karbo', color: 'var(--color-carbs)' },
          { val: `${fat}g`, label: 'Lemak', color: 'var(--color-fat)' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xl font-semibold" style={{ color: s.color }}>{s.val}</span>
            <span className="text-2xs text-secondary uppercase tracking-[0.4px]">{s.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function RiwayatPage() {
  const router = useRouter()
  const { openCaptureMenu } = useCapture()
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [paging, setPaging] = useState(false)
  const [filterDate, setFilterDate] = useState(todayStr())

  const load = useCallback(async (p: number, isPaging = false, date = todayStr()) => {
    if (isPaging) setPaging(true)
    else setLoading(true)
    try {
      const res = await fetch(`/api/history?action=list&page=${p}&per_page=10&date=${date}`, { headers: authHeaders() })
      if (res.status === 401) { router.replace('/login'); return }
      const data = await res.json()
      setHistory(data)
      setPage(p)
    } finally {
      setLoading(false)
      setPaging(false)
    }
  }, [router])

  useEffect(() => { load(1, false, todayStr()) }, [load])

  // Silently refresh the current view whenever a meal is saved via the FAB capture overlay.
  useEffect(() => {
    const handler = () => load(1, true, filterDate)
    window.addEventListener(MEAL_SAVED_EVENT, handler)
    return () => window.removeEventListener(MEAL_SAVED_EVENT, handler)
  }, [load, filterDate])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value || todayStr()
    setFilterDate(val)
    load(1, true, val)
  }

  function goToday() {
    setFilterDate(todayStr())
    load(1, true, todayStr())
  }

  function openDetail(meal: Meal) {
    sessionStorage.setItem(`nl_riwayat_detail_${meal.id}`, JSON.stringify(meal))
    router.push(`/main/riwayat/${meal.id}`)
  }

  const grouped = history?.meals.reduce((acc, meal) => {
    const date = localDateStr(new Date(meal.loggedAt))
    if (!acc[date]) acc[date] = []
    acc[date].push(meal)
    return acc
  }, {} as Record<string, Meal[]>) ?? {}

  const notToday = filterDate !== todayStr()
  const noMeals = !loading && !paging && history && history.meals.length === 0

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div
        className="flex items-center justify-center pb-1.5"
        style={{ paddingTop: 'calc(58px + env(safe-area-inset-top, 0px))' }}
      >
        <span className="text-xl font-semibold text-primary tracking-tight">Gizku</span>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-8">
        <div className="text-2xl font-semibold text-primary my-2 mb-3.5">Riwayat</div>

        {/* compact date filter */}
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="relative inline-flex shrink-0">
            <div className="flex items-center gap-2 h-10 px-3.5 rounded-pill bg-sunken pointer-events-none select-none">
              <IconCalendar size={16} color="var(--color-text-secondary)" />
              <span className="text-sm font-medium text-primary whitespace-nowrap">
                {notToday ? fmtDateStr(filterDate) : 'Hari Ini'}
              </span>
              <IconChevronDown size={10} color="var(--color-text-secondary)" />
            </div>
            <input
              type="date"
              value={filterDate}
              max={todayStr()}
              onChange={handleDateChange}
              aria-label="Filter tanggal"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          {notToday && <Chip label="Hari Ini" onClick={goToday} />}
        </div>

        {(loading && !history) && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="gizku-skeleton h-20" />)}
          </div>
        )}

        {paging && (
          <div className="flex flex-col gap-3">
            <div className="gizku-skeleton h-28" />
            <div className="gizku-skeleton h-16" />
            <div className="gizku-skeleton h-16" />
          </div>
        )}

        {noMeals && notToday && (
          <div className="flex flex-col items-center text-center py-16 px-6 gap-2">
            <IconCalendar size={40} color="var(--color-text-tertiary)" strokeWidth={1.8} />
            <div className="text-lg font-semibold text-primary">Tidak ada riwayat makanan</div>
            <div className="text-sm text-secondary leading-normal max-w-[260px]">
              Tidak ditemukan catatan makan pada {fmtDateStr(filterDate)}
            </div>
            <div className="mt-2">
              <Button variant="outline" size="md" fullWidth={false} onClick={goToday}>Kembali ke Hari Ini</Button>
            </div>
          </div>
        )}

        {noMeals && !notToday && (
          <div className="flex flex-col items-center text-center py-16 px-6 gap-2">
            <IconMeal size={40} color="var(--color-text-tertiary)" strokeWidth={1.6} />
            <div className="text-lg font-semibold text-primary">Belum Ada Catatan Makan</div>
            <div className="text-sm text-secondary leading-normal max-w-[260px]">Foto makananmu dan AI akan mencatat kandungan gizinya.</div>
            <div className="mt-2">
              <Button size="md" fullWidth={false} onClick={openCaptureMenu}>Ambil Foto Sekarang</Button>
            </div>
          </div>
        )}

        {!paging && history && history.meals.length > 0 && (
          <>
            {Object.entries(grouped).map(([date, meals]) => {
              const totalKcal = meals.reduce((s, m) => s + m.totalCalories, 0)
              const totalP = meals.reduce((s, m) => s + parseFloat(m.totalProtein), 0)
              const totalK = meals.reduce((s, m) => s + parseFloat(m.totalCarbs), 0)
              const totalL = meals.reduce((s, m) => s + parseFloat(m.totalFat), 0)

              return (
                <div key={date} className="mb-5">
                  <NutritionSummary
                    label={fmtDateStr(date)}
                    kcal={totalKcal}
                    protein={totalP.toFixed(1)}
                    carbs={totalK.toFixed(1)}
                    fat={totalL.toFixed(1)}
                  />

                  <Card className="overflow-hidden">
                    {meals.map((meal, i) => (
                      <div
                        key={meal.id}
                        onClick={() => openDetail(meal)}
                        className="flex items-center gap-3 px-3.5 py-3 cursor-pointer"
                        style={{ borderBottom: i < meals.length - 1 ? '1px solid var(--color-border-default)' : 'none' }}
                      >
                        <div className="w-12 h-12 rounded-[10px] bg-sunken flex items-center justify-center shrink-0 overflow-hidden">
                          {meal.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={meal.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <IconMeal size={18} color="var(--color-text-tertiary)" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium text-primary truncate">
                            {meal.dishNames.length > 0 ? meal.dishNames.join(', ') : 'Makanan'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-secondary">{fmtTime(meal.loggedAt)}</span>
                            <SourceBadge source={meal.source} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end mr-0.5 shrink-0">
                          <span className="text-base font-semibold text-primary">{meal.totalCalories}</span>
                          <span className="text-2xs text-tertiary">Kkal</span>
                        </div>
                        <IconChevronRight size={12} color="var(--color-text-tertiary)" className="shrink-0" />
                      </div>
                    ))}
                  </Card>
                </div>
              )
            })}

            {history.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                {page > 1 && (
                  <>
                    <button disabled={paging} onClick={() => load(1, true, filterDate)} className="h-[34px] px-3 rounded-sm bg-surface shadow-hairline text-xs font-medium text-primary cursor-pointer disabled:cursor-not-allowed">« First</button>
                    <button disabled={paging} onClick={() => load(page - 1, true, filterDate)} className="h-[34px] px-3 rounded-sm bg-surface shadow-hairline text-xs font-medium text-primary cursor-pointer disabled:cursor-not-allowed">← Prev</button>
                  </>
                )}
                <span className="text-xs text-secondary min-w-[56px] text-center">{page} / {history.totalPages}</span>
                {page < history.totalPages && (
                  <button disabled={paging} onClick={() => load(page + 1, true, filterDate)} className="h-[34px] px-3 rounded-sm bg-surface shadow-hairline text-xs font-medium text-primary cursor-pointer disabled:cursor-not-allowed">Next →</button>
                )}
              </div>
            )}
          </>
        )}

        <div className="text-center text-2xs text-tertiary mt-6">© 2026 gizku.com</div>
      </div>
    </div>
  )
}
