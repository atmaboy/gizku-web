'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'

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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateStr(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const C = {
  bg: '#F9FAFB',
  white: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  green: '#2ECC71',
  greenDim: '#D4F5E4',
  summaryBg: '#F0FDF4',
  summaryBorder: '#BBF7D0',
  summaryPillBg: '#D4F5E4',
  summaryPillText: '#166534',
  red: '#EF4444',
  coral: '#FF6B6B',
  blue: '#6B9FD4',
  purple: '#9B8EC4',
}

const IconFire = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-3-2-6-2-6s-1 3-3 3c-1 0-2-1-2-2 0-2 2-6 2-8z" fill="#FF8A65"/>
  </svg>
)
const IconDumbbell = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2.2" strokeLinecap="round">
    <rect x="2" y="10" width="4" height="4" rx="1"/>
    <rect x="18" y="10" width="4" height="4" rx="1"/>
    <line x1="6" y1="12" x2="18" y2="12"/>
    <rect x="7" y="9" width="3" height="6" rx="1"/>
    <rect x="14" y="9" width="3" height="6" rx="1"/>
  </svg>
)
const IconGrain = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B9FD4" strokeWidth="2" strokeLinecap="round">
    <ellipse cx="12" cy="12" rx="4" ry="7"/>
    <path d="M12 5 Q16 8 12 12 Q8 16 12 19"/>
  </svg>
)
const IconDrop = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 3 C12 3 5 12 5 16a7 7 0 0 0 14 0c0-4-7-13-7-13z" fill="#81C784"/>
  </svg>
)
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
)
const IconLightbulb = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.5.55 2.7 1.5 3.5.75.76 1.23 1.52 1.41 2.5"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconFilter = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)
const IconSalad = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5z"/>
    <path d="M3 10h18"/>
    <path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>
    <path d="M9 14h6"/>
  </svg>
)

function SourceBadge({ source }: { source?: string }) {
  const isTelegram = source === 'telegram'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600,
      background: isTelegram ? '#EFF6FF' : '#F3F4F6',
      color: isTelegram ? '#2563EB' : '#6B7280',
      border: `1px solid ${isTelegram ? '#BFDBFE' : '#E5E7EB'}`,
    }}>
      {isTelegram ? '✈️ Telegram' : '🌐 Web'}
    </span>
  )
}

function SkeletonBlock({ height, radius = 12, width = '100%' }: { height: number; radius?: number; width?: string }) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: 'linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

function PaginationSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SkeletonBlock height={14} width="40%" radius={6} />
      <div style={{ background: '#F6FDF8', border: '1.5px solid #D1FAE5', borderRadius: 20, padding: '12px 16px 14px' }}>
        <SkeletonBlock height={22} width="38%" radius={999} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <SkeletonBlock height={14} width="14px" radius={999} />
              <SkeletonBlock height={18} width="60%" radius={6} />
              <SkeletonBlock height={11} width="50%" radius={4} />
            </div>
          ))}
        </div>
      </div>
      {[0,1,2].map(i => (
        <div key={i} style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: '13px 16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <SkeletonBlock height={14} width={`${65 + i * 8}%`} radius={6} />
            <SkeletonBlock height={11} width="35%" radius={4} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
            <SkeletonBlock height={14} width="36px" radius={5} />
            <SkeletonBlock height={10} width="24px" radius={4} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RiwayatPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [paging, setPaging] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)
  const [modalMeal, setModalMeal] = useState<Meal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  const load = useCallback(async (p: number, isPaging = false, date = '') => {
    if (isPaging) {
      setPaging(true)
      setContentVisible(false)
      await new Promise(r => setTimeout(r, 180))
    } else {
      setLoading(true)
    }
    try {
      const dateQuery = date ? `&date=${date}` : ''
      const res = await fetch(`/api/history?action=list&page=${p}&per_page=10${dateQuery}`, { headers: authHeaders() })
      if (res.status === 401) { router.replace('/login'); return }
      const data = await res.json()
      setHistory(data)
      setPage(p)
    } finally {
      setLoading(false)
      setPaging(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setContentVisible(true)))
    }
  }, [router])

  useEffect(() => { load(1) }, [load])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setFilterDate(val)
    load(1, true, val)
  }

  function handleResetFilter() {
    setFilterDate('')
    load(1, true, '')
  }

  async function deleteMeal(id: string) {
    if (!confirm('Hapus data makan ini?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) { toast.error('Gagal menghapus'); return }
      toast.success('Data berhasil dihapus')
      setModalMeal(null)
      load(page, false, filterDate)
    } finally {
      setDeleting(false)
    }
  }

  const grouped = history?.meals.reduce((acc, meal) => {
    const date = new Date(meal.loggedAt).toISOString().split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(meal)
    return acc
  }, {} as Record<string, Meal[]>) ?? {}

  const isFiltering = filterDate !== ''

  const nutriStats = (kcal: number | string, p: string, k: string, l: string) => [
    { icon: <IconFire />, val: String(kcal), label: 'Kalori', valColor: '#FF8A65' },
    { icon: <IconDumbbell />, val: typeof p === 'string' ? p : `${parseFloat(p).toFixed(1)}g`, label: 'Protein', valColor: '#2ECC71' },
    { icon: <IconGrain />, val: typeof k === 'string' ? k : `${parseFloat(k).toFixed(1)}g`, label: 'Karbo', valColor: '#6B9FD4' },
    { icon: <IconDrop />, val: typeof l === 'string' ? l : `${parseFloat(l).toFixed(1)}g`, label: 'Lemak', valColor: '#81C784' },
  ]

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .5 } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .date-overlay {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
          z-index: 2;
        }
        .date-overlay::-webkit-date-and-time-value { opacity: 0; }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12,
              border: `1.5px solid ${isFiltering ? C.summaryBorder : C.border}`,
              background: isFiltering ? C.summaryPillBg : C.white,
              color: isFiltering ? C.summaryPillText : C.muted,
              fontSize: 13, fontWeight: 600,
              pointerEvents: 'none', userSelect: 'none',
            }}>
              <IconFilter />
              Filter Tanggal
            </div>
            <input
              type="date"
              className="date-overlay"
              value={filterDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={handleDateChange}
              aria-label="Filter tanggal"
            />
          </div>
          {isFiltering && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 12,
              border: `1.5px solid ${C.summaryBorder}`,
              background: C.summaryBg, flex: 1, minWidth: 0,
            }}>
              <span style={{ color: C.green, flexShrink: 0, display: 'flex', alignItems: 'center' }}><IconCalendar /></span>
              <span style={{ fontSize: 13, color: C.summaryPillText, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fmtDateStr(filterDate)}
              </span>
            </div>
          )}
        </div>
        {isFiltering && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleResetFilter}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.white,
                color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Reset filter
            </button>
          </div>
        )}
      </div>

      {loading && !history && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 76, borderRadius: 20,
              background: 'linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {paging && <PaginationSkeleton />}

      {!paging && !loading && history && history.meals.length === 0 && isFiltering && (
        <div style={{ textAlign: 'center', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.45 }}><IconCalendar /></div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>Tidak ada riwayat makanan</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
            Tidak ditemukan catatan makan pada<br />
            <strong style={{ color: C.text }}>{fmtDateStr(filterDate)}</strong>
          </div>
          <button onClick={handleResetFilter} style={{
            padding: '10px 20px', background: C.summaryBg,
            border: `1.5px solid ${C.summaryBorder}`, borderRadius: 12,
            color: C.summaryPillText, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>Lihat Semua Riwayat</button>
        </div>
      )}

      {!paging && !loading && history && history.meals.length === 0 && !isFiltering && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.45 }}><IconSalad /></div>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 6 }}>Belum Ada Catatan Makan</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Foto makananmu dan AI akan mencatat kandungan gizinya.</div>
          <button onClick={() => router.push('/main/catat')} style={{
            padding: '11px 24px', background: C.green, borderRadius: 13,
            color: '#FFFFFF', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
          }}>Catat Makanan Pertama</button>
        </div>
      )}

      {!paging && history && history.meals.length > 0 && (
        <div style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 220ms ease' }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
            {isFiltering ? `${history.total} catatan pada ${fmtDateStr(filterDate)}` : `${history.total} total catatan`}
          </div>

          {Object.entries(grouped).map(([date, meals]) => {
            const totalKcal = meals.reduce((s, m) => s + m.totalCalories, 0)
            const totalP    = meals.reduce((s, m) => s + parseFloat(m.totalProtein), 0)
            const totalK    = meals.reduce((s, m) => s + parseFloat(m.totalCarbs), 0)
            const totalL    = meals.reduce((s, m) => s + parseFloat(m.totalFat), 0)

            return (
              <div key={date} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 10 }}>
                  {fmtDate(date + 'T00:00:00')}
                </div>

                <div style={{ background: C.summaryBg, border: `1.5px solid ${C.summaryBorder}`, borderRadius: 20, padding: '12px 16px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.summaryPillBg, border: `1px solid ${C.summaryBorder}`, borderRadius: 999, padding: '3px 10px', marginBottom: 10 }}>
                    <IconFire />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.summaryPillText, letterSpacing: '.3px' }}>Ringkasan Hari Ini</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                    {nutriStats(totalKcal, totalP.toFixed(1) + 'g', totalK.toFixed(1) + 'g', totalL.toFixed(1) + 'g')
                      .map(({ icon, val, label, valColor }) => (
                        <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                          <div style={{ fontWeight: 600, fontSize: 16, color: valColor, lineHeight: 1.1 }}>{val}</div>
                          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.1 }}>{label}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {meals.map(meal => (
                    <div
                      key={meal.id}
                      onClick={() => setModalMeal(meal)}
                      style={{
                        background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: 16, padding: '13px 16px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        transition: 'box-shadow .18s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {meal.dishNames.length > 0 ? meal.dishNames.join(', ') : 'Makanan'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: C.muted }}>{fmtTime(meal.loggedAt)} · {meal.dishNames.length} menu</span>
                          <SourceBadge source={meal.source} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{meal.totalCalories}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>kkal</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {history.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 8, flexWrap: 'wrap' }}>
              {page > 1 && (
                <button disabled={paging} onClick={() => load(1, true, filterDate)} title="Halaman pertama" style={{ padding: '9px 12px', borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, cursor: paging ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                  First
                </button>
              )}
              <button disabled={page === 1 || paging} onClick={() => load(page - 1, true, filterDate)} style={{ padding: '9px 14px', borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: (page === 1 || paging) ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>← Prev</button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13, minWidth: 52, justifyContent: 'center' }}>
                {paging ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }}><path d="M12 2 a10 10 0 0 1 10 10" /></svg>
                ) : `${page} / ${history.totalPages}`}
              </span>
              <button disabled={page === history.totalPages || paging} onClick={() => load(page + 1, true, filterDate)} style={{ padding: '9px 14px', borderRadius: 12, background: paging ? C.bg : C.white, border: `1px solid ${C.border}`, color: paging ? C.muted : C.text, fontSize: 13, cursor: (page === history.totalPages || paging) ? 'not-allowed' : 'pointer', opacity: page === history.totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {paging ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin .7s linear infinite' }}><path d="M12 2 a10 10 0 0 1 10 10" /></svg>Memuat…</>) : 'Next →'}
              </button>
            </div>
          )}
        </div>
      )}

      {modalMeal && (
        <div onClick={() => setModalMeal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .3s cubic-bezier(.34,1.1,.64,1) both', WebkitOverflowScrolling: 'touch', boxShadow: '0 -8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
              <div style={{ width: 36, height: 4, background: C.border, borderRadius: 4 }} />
              <button onClick={() => setModalMeal(null)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '6px 12px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕ Tutup</button>
            </div>
            <div style={{ padding: '0 16px calc(28px + env(safe-area-inset-bottom, 0px))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: C.text }}>{modalMeal.dishNames.join(', ') || 'Makanan'}</div>
                <SourceBadge source={modalMeal.source} />
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{fmtDate(modalMeal.loggedAt)} · {fmtTime(modalMeal.loggedAt)}</div>

              {modalMeal.imageUrl && (
                <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                  <Image
                    src={modalMeal.imageUrl}
                    alt={`Foto ${modalMeal.dishNames.join(', ') || 'makanan'}`}
                    fill
                    sizes="(max-width: 480px) 100vw, 480px"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16, background: C.summaryBg, border: `1.5px solid ${C.summaryBorder}`, borderRadius: 20, padding: '12px 8px' }}>
                {nutriStats(modalMeal.totalCalories, `${parseFloat(modalMeal.totalProtein).toFixed(1)}g`, `${parseFloat(modalMeal.totalCarbs).toFixed(1)}g`, `${parseFloat(modalMeal.totalFat).toFixed(1)}g`)
                  .map(({ icon, val, label, valColor }) => (
                    <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      {icon}
                      <div style={{ fontWeight: 600, fontSize: 15, color: valColor }}>{val}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                    </div>
                  ))
                }
              </div>
              {modalMeal.rawAnalysis?.dishes && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>Menu Terdeteksi</div>
                  {modalMeal.rawAnalysis.dishes.map((d, i) => (
                    <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{d.portion}</div>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#FF8A65' }}>{d.calories} kkal</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: C.muted }}>
                        <span style={{ color: '#2ECC71' }}>P: {d.protein}g</span>
                        <span style={{ color: '#6B9FD4' }}>K: {d.carbs}g</span>
                        <span style={{ color: '#81C784' }}>L: {d.fat}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {modalMeal.rawAnalysis?.notes && (
                <div style={{ background: C.summaryBg, border: `1px solid ${C.summaryBorder}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ flexShrink: 0, marginTop: 2, color: C.green }}><IconLightbulb /></span>
                  <span>{modalMeal.rawAnalysis.notes}</span>
                </div>
              )}
              <button onClick={() => deleteMeal(modalMeal.id)} disabled={deleting} style={{ width: '100%', padding: 13, borderRadius: 13, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: C.red, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: deleting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <IconTrash />
                {deleting ? 'Menghapus...' : 'Hapus Data Ini'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
