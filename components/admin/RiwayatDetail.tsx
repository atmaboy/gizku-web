'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  CalendarRange, CalendarX, ChevronDown, ChevronUp, Clock, Download, Flame, Globe, ImageOff, Send, Smartphone, Trash2, X,
  type LucideIcon,
} from 'lucide-react'
import {
  Button, Card, DataTable, EmptyState, Input, Modal, Pagination, Skeleton, Timeline, TimelineEnd, TimelineItem, TimelineLabel,
} from '@/components/admin/ui'
import { cn } from '@/lib/utils'

type MenuItem = {
  name?: string
  portion?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  [key: string]: unknown
}

type Meal = {
  id: string
  dishNames: string[]
  totalCalories: number
  totalProtein: string
  totalCarbs: string
  totalFat: string
  imageUrl: string | null
  source: string
  rawAnalysis: {
    // Bentuk asli dari /api/analyze (lib/bot.ts & app/api/analyze/route.ts)
    dishes?: MenuItem[]
    notes?: string
    assessment?: string
    [key: string]: unknown
  } | null
  loggedAt: string
}

type PageData = { meals: Meal[]; total: number; page: number; totalPages: number }
type AdminMealsResponse = { meals?: Meal[]; total?: number; page?: number; totalPages?: number; error?: string }

const DAY_MS = 24 * 60 * 60 * 1000
const PER_PAGE = 10

const SOURCE_META: Record<string, { label: string; dot: string; icon: LucideIcon }> = {
  'app-android': { label: 'Android',  dot: 'bg-android',  icon: Smartphone },
  'app-ios':     { label: 'iOS',      dot: 'bg-bark-900', icon: Smartphone },
  telegram:      { label: 'Telegram', dot: 'bg-tg',       icon: Send },
  web:           { label: 'Web',      dot: 'bg-clay-500', icon: Globe },
}

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * DAY_MS).toISOString().split('T')[0]
}
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function fmtDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtDateStr(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function Macro({ value, label, className, dotClass }: { value: string; label: string; className: string; dotClass?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-secondary">
      {dotClass
        ? <span aria-hidden className={cn('w-2 h-2 rounded-full', dotClass)} />
        : <Flame size={14} className={className} aria-hidden />}
      <strong className={cn('font-bold', dotClass ? 'text-primary' : className)}>{value}</strong>{label}
    </span>
  )
}

function MacroChip({ value, label, className }: { value: string; label: string; className: string }) {
  return (
    <div className="bg-sunken rounded-sm py-1.5 px-1 text-center min-w-0">
      <p className={cn('text-base font-bold tabular-nums leading-tight truncate', className)}>{value}</p>
      <p className="text-[11px] text-secondary">{label}</p>
    </div>
  )
}

function Thumb({ meal, label, onOpen, className }: { meal: Meal; label: string; onOpen: () => void; className: string }) {
  const [broken, setBroken] = useState(false)
  if (!meal.imageUrl || broken) {
    return (
      <div className={cn('shrink-0 rounded-sm bg-muted border border-border flex flex-col items-center justify-center text-secondary gap-1', className)}>
        <ImageOff size={20} aria-hidden /><span className="text-[11px]">No foto</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Klik untuk perbesar"
      aria-label={`Perbesar foto ${label}`}
      className={cn('shrink-0 rounded-sm overflow-hidden bg-muted border border-border group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2', className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meal.imageUrl} alt={label} loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
    </button>
  )
}

export default function RiwayatDetail({ userId }: { userId: string }) {
  const [data, setData]         = useState<PageData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [paging, setPaging]     = useState(false)
  const [page, setPage]         = useState(1)
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(10))
  const [dateTo, setDateTo]     = useState(todayStr())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Meal | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)
  const lightboxClose = useRef<HTMLButtonElement>(null)

  const load = useCallback(async (p: number, isPaging: boolean, from: string, to: string) => {
    if (isPaging) setPaging(true); else setLoading(true)
    const rangeQuery = `${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`
    try {
      const res = await fetch(
        `/api/admin?action=user_meals&user_id=${userId}&page=${p}&per_page=${PER_PAGE}${rangeQuery}`,
      )
      const d = await res.json() as AdminMealsResponse
      setData({ meals: d.meals ?? [], total: d.total ?? 0, page: d.page ?? p, totalPages: d.totalPages ?? 1 })
      setPage(p)
    } finally {
      setLoading(false)
      setPaging(false)
    }
  }, [userId])

  useEffect(() => { load(1, false, dateFrom, dateTo) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lightbox) return
    lightboxClose.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const from = e.target.value
    let to = dateTo || todayStr()
    if (from && to) {
      const spanDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS)
      if (spanDays > 30) to = new Date(new Date(from).getTime() + 30 * DAY_MS).toISOString().split('T')[0]
      if (spanDays < 0) to = from
    }
    setDateFrom(from); setDateTo(to)
    load(1, true, from, to)
  }
  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const to = e.target.value
    let from = dateFrom || isoDaysAgo(10)
    if (from && to) {
      const spanDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS)
      if (spanDays > 30) from = new Date(new Date(to).getTime() - 30 * DAY_MS).toISOString().split('T')[0]
      if (spanDays < 0) from = to
    }
    setDateFrom(from); setDateTo(to)
    load(1, true, from, to)
  }
  function handleResetFilter() {
    setDateFrom(''); setDateTo('')
    load(1, true, '', '')
  }

  async function deleteMeal(mealId: string) {
    setDeleting(mealId)
    try {
      const r = await fetch(`/api/admin?action=delete_meal`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mealId }),
      })
      const d = await r.json() as { error?: string }
      if (r.ok) { toast.success('Riwayat dihapus'); setPendingDelete(null); load(page, false, dateFrom, dateTo) }
      else toast.error(d.error)
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setDeleting(null)
    }
  }

  function getMenuItems(meal: Meal): MenuItem[] {
    return meal.rawAnalysis?.dishes ?? []
  }
  function getDescription(meal: Meal): string {
    return meal.rawAnalysis?.notes ?? ''
  }

  const meals       = data?.meals ?? []
  const totalPages  = data?.totalPages ?? 1
  const total       = data?.total ?? 0
  const isFiltering = !!(dateFrom || dateTo)
  const busy        = loading || paging

  // Group meals by local calendar day (already sorted newest first by the API).
  const groups: { day: string; meals: Meal[] }[] = []
  for (const m of meals) {
    const day = fmtDayLabel(m.loggedAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.meals.push(m)
    else groups.push({ day, meals: [m] })
  }

  return (
    <>
      {/* ── Lightbox ── */}
      {lightbox && (
        <div role="dialog" aria-modal="true" aria-label={lightbox.name} className="fixed inset-0 z-[120] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="w-full max-w-2xl flex items-center justify-between gap-3 mb-3" onClick={e => e.stopPropagation()}>
            <p className="text-white/80 text-base font-medium truncate">{lightbox.name}</p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={lightbox.url} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 rounded-sm bg-white/10 hover:bg-white/20 text-white text-sm min-h-11"
              >
                <Download size={14} aria-hidden />Download
              </a>
              <button
                ref={lightboxClose}
                type="button"
                onClick={() => setLightbox(null)}
                className="flex items-center gap-1.5 px-3 rounded-sm bg-white/10 hover:bg-white/20 text-white text-sm min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={14} aria-hidden />Tutup
              </button>
            </div>
          </div>
          <div className="w-full max-w-2xl flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.name} className="max-h-[70vh] w-full object-contain rounded-md shadow-2xl" />
          </div>
          <p className="text-white/60 text-sm mt-3 text-center">Klik di luar foto atau tekan Esc untuk menutup</p>
        </div>
      )}

      {/* ── Date range filter ── */}
      <Card outline="brand" icon={CalendarRange} title="Filter Rentang Tanggal">
        <div className="flex items-end gap-3 flex-wrap max-lg:grid max-lg:grid-cols-2 max-lg:gap-2">
          <div className="lg:w-[180px]">
            <label htmlFor="riwayat-from" className="block mb-1.5 text-base font-semibold text-primary">Dari</label>
            <Input id="riwayat-from" type="date" value={dateFrom} max={dateTo || todayStr()} onChange={handleFromChange} style={{ colorScheme: 'light' }} />
          </div>
          <span className="text-base text-secondary pb-2.5 max-lg:hidden" aria-hidden>s/d</span>
          <div className="lg:w-[180px]">
            <label htmlFor="riwayat-to" className="block mb-1.5 text-base font-semibold text-primary">Sampai</label>
            <Input id="riwayat-to" type="date" value={dateTo} max={todayStr()} onChange={handleToChange} style={{ colorScheme: 'light' }} />
          </div>
          {isFiltering && (
            <Button variant="outline" icon={X} onClick={handleResetFilter} className="max-lg:hidden">Reset</Button>
          )}
          <div className="lg:ml-auto lg:text-right max-lg:col-span-2 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-2">
            <p className="text-base text-primary">
              <span className="lg:hidden text-sm text-secondary">Rentang maks. 30 hari · </span>
              <span className="max-lg:text-sm">Menampilkan <strong>{busy ? '…' : total} entri</strong></span>
            </p>
            <p className="text-sm text-secondary max-lg:hidden">Rentang maksimal 30 hari.</p>
            {isFiltering && (
              <Button variant="outline" size="sm" icon={X} onClick={handleResetFilter} className="lg:hidden">Reset</Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Timeline ── */}
      {busy && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat riwayat">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px] rounded-md lg:ml-16 ml-10" />)}
        </div>
      )}

      {!busy && meals.length === 0 && isFiltering && (
        <Card>
          <EmptyState
            icon={CalendarX}
            title="Tidak ada riwayat makanan"
            description={<>Tidak ditemukan catatan pada rentang <strong className="text-primary">{dateFrom ? fmtDateStr(dateFrom) : '…'} s/d {dateTo ? fmtDateStr(dateTo) : '…'}</strong></>}
            action={<Button variant="outline-primary" onClick={handleResetFilter}>Lihat Semua Riwayat</Button>}
          />
        </Card>
      )}

      {!busy && meals.length === 0 && !isFiltering && (
        <Card><EmptyState icon={CalendarX} title="Belum ada riwayat analisa untuk user ini." /></Card>
      )}

      {!busy && meals.length > 0 && (
        <Timeline>
          {groups.map(g => (
            <GroupItems key={g.day} day={g.day}>
              {g.meals.map(meal => {
                const menuItems  = getMenuItems(meal)
                const desc       = getDescription(meal)
                const isExpanded = expanded === meal.id
                const dishLabel  = meal.dishNames.length > 0 ? meal.dishNames.join(', ') : 'Tidak terdeteksi'
                const sm = SOURCE_META[meal.source] ?? SOURCE_META.web
                const kcal = `${meal.totalCalories}`
                const p = `${Number(meal.totalProtein).toFixed(1)}g`
                const c = `${Number(meal.totalCarbs).toFixed(1)}g`
                const f = `${Number(meal.totalFat).toFixed(1)}g`
                const openLightbox = () => setLightbox({ url: meal.imageUrl!, name: dishLabel })
                const canExpand = menuItems.length > 0 || !!desc
                const expandLabel = isExpanded ? 'Tutup menu' : menuItems.length > 0 ? `Lihat ${menuItems.length} menu` : 'Detail'

                return (
                  <TimelineItem key={meal.id} icon={sm.icon}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border flex items-start gap-3 max-lg:px-3">
                      <Thumb meal={meal} label={dishLabel} onOpen={openLightbox} className="w-[76px] h-[76px] lg:hidden" />
                      <div className="min-w-0 flex-1 flex items-start gap-3 max-lg:flex-col max-lg:gap-1">
                        <h3 className={cn('text-[15px] font-semibold flex-1 min-w-0 leading-snug', meal.dishNames.length ? 'text-primary' : 'text-secondary italic')}>
                          {dishLabel}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-secondary shrink-0">
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden className={cn('w-2 h-2 rounded-full', sm.dot)} />{sm.label}
                          </span>
                          <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden />{fmtTime(meal.loggedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 max-lg:p-3 flex gap-4">
                      <Thumb meal={meal} label={dishLabel} onOpen={openLightbox} className="w-28 h-28 max-lg:hidden" />
                      <div className="min-w-0 flex-1">
                        {desc && <p className="text-base text-bark-700 italic leading-normal line-clamp-3">“{desc}”</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 max-lg:hidden">
                          <Macro value={kcal} label="kcal" className="text-kcal" />
                          <Macro value={p} label="protein" className="text-protein" dotClass="bg-protein" />
                          <Macro value={c} label="karbo" className="text-carbs" dotClass="bg-carbs" />
                          <Macro value={f} label="lemak" className="text-fat" dotClass="bg-fat" />
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mt-2.5 lg:hidden">
                          <MacroChip value={kcal} label="kcal" className="text-kcal" />
                          <MacroChip value={p} label="protein" className="text-protein" />
                          <MacroChip value={c} label="karbo" className="text-carbs" />
                          <MacroChip value={f} label="lemak" className="text-fat" />
                        </div>
                      </div>
                    </div>

                    {/* Expanded menu */}
                    {isExpanded && menuItems.length > 0 && (
                      <div className="border-t border-border" id={`meal-menu-${meal.id}`}>
                        <div className="max-lg:hidden">
                          <DataTable
                            compact
                            rows={menuItems}
                            rowKey={(_, i) => String(i)}
                            columns={[
                              { key: 'n', header: 'Menu', render: (it, i) => <span className="font-medium">{it.name ?? `Menu ${i + 1}`}</span> },
                              { key: 'p', header: 'Porsi', className: 'text-secondary', render: it => it.portion ?? '—' },
                              { key: 'k', header: 'Kalori', align: 'right', render: it => it.calories ?? '—' },
                              { key: 'pr', header: 'Protein', align: 'right', render: it => it.protein !== undefined ? `${it.protein}g` : '—' },
                              { key: 'c', header: 'Karbo', align: 'right', render: it => it.carbs !== undefined ? `${it.carbs}g` : '—' },
                              { key: 'f', header: 'Lemak', align: 'right', render: it => it.fat !== undefined ? `${it.fat}g` : '—' },
                            ]}
                          />
                        </div>
                        <ul className="lg:hidden list-none m-0 p-0">
                          {menuItems.map((it, i) => (
                            <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 border-t border-border first:border-t-0">
                              <div className="min-w-0">
                                <p className="text-base font-medium text-primary">{it.name ?? `Menu ${i + 1}`}</p>
                                {it.portion && <p className="text-sm text-secondary">{it.portion}</p>}
                              </div>
                              {it.calories !== undefined && <span className="text-sm font-semibold text-kcal shrink-0 tabular-nums">{it.calories} kkal</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {isExpanded && menuItems.length === 0 && desc && (
                      <div className="border-t border-border px-4 py-3 text-base text-bark-700 leading-normal">{desc}</div>
                    )}

                    {/* Footer */}
                    <div className="px-4 py-2.5 max-lg:px-3 bg-sunken border-t border-border flex items-center gap-2">
                      {canExpand && (
                        <Button
                          variant="outline-primary" size="sm"
                          icon={isExpanded ? ChevronUp : ChevronDown}
                          aria-expanded={isExpanded}
                          aria-controls={menuItems.length > 0 ? `meal-menu-${meal.id}` : undefined}
                          onClick={() => setExpanded(isExpanded ? null : meal.id)}
                          className="max-lg:flex-1"
                        >
                          {expandLabel}
                        </Button>
                      )}
                      <Button
                        variant="outline-danger" size="sm" icon={Trash2}
                        loading={deleting === meal.id}
                        onClick={() => setPendingDelete(meal)}
                        aria-label="Hapus riwayat makanan"
                        className="lg:ml-0 max-lg:ml-auto max-lg:px-3"
                      >
                        <span className="max-lg:hidden">Hapus</span>
                      </Button>
                    </div>
                  </TimelineItem>
                )
              })}
            </GroupItems>
          ))}
          <TimelineEnd icon={Clock} />
        </Timeline>
      )}

      {!loading && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={p => !paging && load(p, true, dateFrom, dateTo)}
          label={paging ? 'Memuat…' : `Hal. ${page} / ${totalPages} · ${total} entri`}
        />
      )}

      <Modal
        open={!!pendingDelete}
        onClose={() => { if (!deleting) setPendingDelete(null) }}
        title="Hapus riwayat analisa ini?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={!!deleting}>Batal</Button>
            <Button variant="danger" icon={Trash2} loading={!!deleting} onClick={() => pendingDelete && deleteMeal(pendingDelete.id)}>Hapus</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          <strong className="text-primary">{pendingDelete?.dishNames.length ? pendingDelete.dishNames.join(', ') : 'Entri ini'}</strong> akan dihapus permanen dari riwayat user. Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </>
  )
}

function GroupItems({ day, children }: { day: string; children: React.ReactNode }) {
  return (
    <>
      <TimelineLabel>{day}</TimelineLabel>
      {children}
    </>
  )
}
