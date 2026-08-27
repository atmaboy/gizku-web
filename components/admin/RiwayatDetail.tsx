'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

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

const SOURCE_META: Record<string, { label: string; dot: string }> = {
  'app-android': { label: 'Android',  dot: '#3DDC84' },
  'app-ios':     { label: 'iOS',      dot: '#111827' },
  telegram:      { label: 'Telegram', dot: '#229ED9' },
  web:           { label: 'Web',      dot: '#6B7280' },
}

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * DAY_MS).toISOString().split('T')[0]
}
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function FlameIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#f97316">
      <path d="M12 2C9 7 6 9.5 6 14a6 6 0 0 0 12 0c0-3-1.5-5.5-3-7.5C14.5 8.5 13 11 13 13a1 1 0 0 1-2 0c0-3 1-5.5 1-11z" />
    </svg>
  )
}
function DumbbellIcon({ size = 12, color = '#22c55e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="2" y="10" width="3" height="4" rx="1" /><rect x="19" y="10" width="3" height="4" rx="1" />
      <rect x="4" y="8" width="3" height="8" rx="1.5" /><rect x="17" y="8" width="3" height="8" rx="1.5" />
      <rect x="7" y="11" width="10" height="2" rx="1" />
    </svg>
  )
}
function GrainIcon({ size = 12, color = '#3b82f6' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <ellipse cx="12" cy="6" rx="3" ry="2.5" /><ellipse cx="8" cy="9" rx="2.5" ry="2" /><ellipse cx="16" cy="9" rx="2.5" ry="2" />
      <ellipse cx="8.5" cy="13" rx="2.5" ry="2" /><ellipse cx="15.5" cy="13" rx="2.5" ry="2" />
      <line x1="12" y1="21" x2="12" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function DropletIcon({ size = 12, color = '#a855f7' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 3C12 3 6 10 6 15a6 6 0 0 0 12 0C18 10 12 3 12 3z" />
    </svg>
  )
}
function TrashIcon({ size = 14, color = '#f87171' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  )
}
function CalendarIcon({ size = 32, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
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
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef   = useRef<HTMLInputElement>(null)

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
    if (!confirm('Hapus riwayat analisa ini?')) return
    setDeleting(mealId)
    const r = await fetch(`/api/admin?action=delete_meal`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mealId }),
    })
    const d = await r.json() as { error?: string }
    if (r.ok) { toast.success('Riwayat dihapus'); load(page, false, dateFrom, dateTo) }
    else toast.error(d.error)
    setDeleting(null)
  }

  function getMenuItems(meal: Meal): MenuItem[] {
    return meal.rawAnalysis?.dishes ?? []
  }
  function getDescription(meal: Meal): string {
    return meal.rawAnalysis?.notes ?? ''
  }
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  function fmtDateStr(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const meals       = data?.meals ?? []
  const totalPages  = data?.totalPages ?? 1
  const total       = data?.total ?? 0
  const isFiltering = !!(dateFrom || dateTo)

  return (
    <div className="space-y-4">
      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="w-full max-w-2xl flex items-center justify-between mb-3" onClick={e => e.stopPropagation()}>
            <p className="text-white/80 text-sm font-medium truncate max-w-xs">{lightbox.name}</p>
            <div className="flex items-center gap-2">
              <a
                href={lightbox.url} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs transition min-h-[44px]"
                onClick={e => e.stopPropagation()}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </a>
              <button
                onClick={() => setLightbox(null)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs transition min-h-[44px]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Tutup
              </button>
            </div>
          </div>
          <div className="w-full max-w-2xl flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name} className="max-h-[70vh] w-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10" />
          </div>
          <p className="text-white/40 text-xs mt-3 text-center">Klik di luar foto atau tekan Esc untuk menutup</p>
        </div>
      )}

      {/* ── Date range filter ── */}
      <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[130px] max-w-[170px]">
            <input
              ref={fromInputRef}
              type="date"
              value={dateFrom}
              max={dateTo || todayStr()}
              onChange={handleFromChange}
              className="w-full px-3 py-2.5 text-base rounded-xl border transition outline-none min-h-[44px]"
              style={{
                borderColor: dateFrom ? '#BBF7D0' : '#E5E7EB',
                background:  dateFrom ? '#F0FDF4' : '#F9FAFB',
                color:       dateFrom ? '#111827' : '#6B7280',
                colorScheme: 'light',
                fontSize: '16px',
              }}
            />
          </div>
          <span className="text-xs text-[#9CA3AF] shrink-0">s/d</span>
          <div className="relative flex-1 min-w-[130px] max-w-[170px]">
            <input
              ref={toInputRef}
              type="date"
              value={dateTo}
              max={todayStr()}
              onChange={handleToChange}
              className="w-full px-3 py-2.5 text-base rounded-xl border transition outline-none min-h-[44px]"
              style={{
                borderColor: dateTo ? '#BBF7D0' : '#E5E7EB',
                background:  dateTo ? '#F0FDF4' : '#F9FAFB',
                color:       dateTo ? '#111827' : '#6B7280',
                colorScheme: 'light',
                fontSize: '16px',
              }}
            />
          </div>
          {isFiltering && (
            <button
              onClick={handleResetFilter}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition whitespace-nowrap min-h-[44px]"
            >
              ✕ Reset
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">Rentang maksimal 30 hari</p>
      </div>

      {/* ── Meal list ── */}
      <div className="space-y-3">
        {(loading || paging) && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-[#E5E7EB] rounded-xl p-3 flex gap-3 animate-pulse bg-white">
                <div className="w-16 h-16 rounded-lg bg-[#F3F4F6] shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-[#F3F4F6] rounded w-3/4" />
                  <div className="h-3 bg-[#F3F4F6] rounded w-1/3" />
                  <div className="h-3 bg-[#F3F4F6] rounded w-full" />
                  <div className="flex gap-3 mt-1">
                    <div className="h-3 bg-[#F3F4F6] rounded w-16" />
                    <div className="h-3 bg-[#F3F4F6] rounded w-16" />
                    <div className="h-3 bg-[#F3F4F6] rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !paging && meals.length === 0 && isFiltering && (
          <div className="py-10 text-center bg-white ring-1 ring-[#E5E7EB] rounded-[18px]">
            <div className="flex justify-center mb-3"><CalendarIcon size={36} color="#D1D5DB" /></div>
            <p className="text-sm font-semibold text-[#111827] mb-1">Tidak ada riwayat makanan</p>
            <p className="text-xs text-[#6B7280] mb-4">
              Tidak ditemukan catatan pada rentang <strong className="text-[#111827]">
                {dateFrom ? fmtDateStr(dateFrom) : '…'} s/d {dateTo ? fmtDateStr(dateTo) : '…'}
              </strong>
            </p>
            <button
              onClick={handleResetFilter}
              className="text-xs px-4 py-2.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#166534] hover:bg-[#D4F5E4] transition min-h-[44px]"
            >
              Lihat Semua Riwayat
            </button>
          </div>
        )}

        {!loading && !paging && meals.length === 0 && !isFiltering && (
          <div className="py-10 text-center text-[#6B7280] text-sm bg-white ring-1 ring-[#E5E7EB] rounded-[18px]">
            Belum ada riwayat analisa untuk user ini.
          </div>
        )}

        {!loading && !paging && meals.map(meal => {
          const menuItems  = getMenuItems(meal)
          const desc       = getDescription(meal)
          const isExpanded = expanded === meal.id
          const dishLabel  = meal.dishNames.length > 0 ? meal.dishNames.join(', ') : 'Tidak terdeteksi'
          const sm = SOURCE_META[meal.source] ?? SOURCE_META.web

          return (
            <div key={meal.id} className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
              <div className="flex items-start gap-3 p-3">
                {meal.imageUrl ? (
                  <button
                    onClick={() => setLightbox({ url: meal.imageUrl!, name: dishLabel })}
                    title="Klik untuk perbesar"
                    aria-label={`Perbesar foto ${dishLabel}`}
                    className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#F3F4F6] group relative border border-[#E5E7EB]"
                  >
                    <img
                      src={meal.imageUrl} alt={dishLabel}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      loading="lazy"
                      onError={e => {
                        const t = e.target as HTMLImageElement
                        t.style.display = 'none'
                        const sibling = t.nextElementSibling as HTMLElement | null
                        sibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden absolute inset-0 flex flex-col items-center justify-center text-[#9CA3AF] gap-0.5">
                      <span className="text-lg">🖼️</span><span className="text-[9px]">No image</span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" className="opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className="shrink-0 w-16 h-16 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col items-center justify-center text-[#D1D5DB] gap-0.5">
                    <span className="text-xl">🍽️</span><span className="text-[9px] text-[#9CA3AF]">No foto</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#111827] truncate">
                    {meal.dishNames.length > 0 ? meal.dishNames.join(', ') : <span className="italic text-[#9CA3AF]">Tidak terdeteksi</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <p className="text-xs text-[#6B7280]">{fmtDate(meal.loggedAt)}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6B7280]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sm.dot }} />
                      {sm.label}
                    </span>
                  </div>

                  {desc && (
                    <p className="text-xs text-[#6B7280] mt-1 line-clamp-2 italic leading-relaxed">&ldquo;{desc}&rdquo;</p>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500">
                      <FlameIcon size={11} />{meal.totalCalories} kkal
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <DumbbellIcon size={11} color="#22c55e" /><strong className="text-[#111827]">{Number(meal.totalProtein).toFixed(1)}g</strong><span>protein</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <GrainIcon size={11} color="#3b82f6" /><strong className="text-[#111827]">{Number(meal.totalCarbs).toFixed(1)}g</strong><span>karbo</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <DropletIcon size={11} color="#a855f7" /><strong className="text-[#111827]">{Number(meal.totalFat).toFixed(1)}g</strong><span>lemak</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end shrink-0">
                  {(menuItems.length > 0 || desc) && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : meal.id)}
                      className="text-xs px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[44px] min-w-[44px]"
                    >
                      {isExpanded ? '▲' : menuItems.length > 0 ? `▼ ${menuItems.length}` : '▼'}
                      <span className="hidden sm:inline">{isExpanded ? ' Tutup' : menuItems.length > 0 ? ' menu' : ' Detail'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    disabled={deleting === meal.id}
                    aria-label="Hapus riwayat makanan"
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition disabled:opacity-50 min-h-[44px] min-w-[44px]"
                  >
                    {deleting === meal.id
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin .7s linear infinite' }}><path d="M12 2 a10 10 0 0 1 10 10" /></svg>
                      : <TrashIcon size={14} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[#E5E7EB] px-3 sm:px-4 py-3 space-y-3 bg-[#F9FAFB]">
                  {desc && (
                    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">Deskripsi Analisa AI</p>
                      <p className="text-xs text-[#374151] leading-relaxed">{desc}</p>
                    </div>
                  )}
                  {menuItems.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Detail Menu Terdeteksi</p>
                      {menuItems.map((item, idx) => (
                        <div key={idx} className="border border-[#E5E7EB] rounded-lg p-3 bg-white space-y-1">
                          <p className="text-sm font-medium text-[#111827]">{item.name ?? `Menu ${idx + 1}`}</p>
                          {item.portion && <p className="text-xs text-[#6B7280] leading-relaxed">{item.portion}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {item.calories !== undefined && <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500"><FlameIcon size={10} /> {item.calories} kkal</span>}
                            {item.protein !== undefined && <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]"><DumbbellIcon size={10} color="#22c55e" /> {item.protein}g protein</span>}
                            {item.carbs !== undefined && <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]"><GrainIcon size={10} color="#3b82f6" /> {item.carbs}g karbo</span>}
                            {item.fat !== undefined && <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]"><DropletIcon size={10} color="#a855f7" /> {item.fat}g lemak</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Pagination ── */}
      {!loading && total > 0 && (
        <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B7280] tabular-nums">
            {paging ? 'Memuat…' : `Hal. ${page} / ${totalPages} · ${total} entri`}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <button
                disabled={paging}
                onClick={() => load(1, true, dateFrom, dateTo)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-50"
              >Pertama</button>
            )}
            <button
              disabled={page <= 1 || paging}
              onClick={() => load(page - 1, true, dateFrom, dateTo)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >← Sebelumnya</button>
            <button
              disabled={page >= totalPages || paging}
              onClick={() => load(page + 1, true, dateFrom, dateTo)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >Berikutnya →</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
