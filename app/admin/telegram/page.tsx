'use client'

import { useEffect, useState, useCallback } from 'react'

type Summary = {
  totalTgUsers: number
  linkedCount: number
  unlinkedCount: number
  activeToday: number
  weeklyTgMeals: number
  monthlyTgMeals: number
}

type TgUser = {
  telegramId: string
  username: string | null
  firstName: string | null
  dailyCount: number
  lastUsedDate: string | null
  linkedTo: string | null
  userId: string | null
  createdAt: string
}

type TgMeal = {
  id: string
  dishNames: string[]
  totalCalories: number
  totalProtein: string
  totalCarbs: string
  totalFat: string
  imageUrl?: string | null
  loggedAt: string
  source: string
  rawAnalysis?: {
    dishes?: Array<{ name: string; portion: string; calories: number; protein: number; carbs: number; fat: number }>
    notes?: string
  }
}

type Config = {
  telegram_free_daily_limit: string | null
  telegram_linked_daily_limit: string | null
  telegram_welcome_message: string | null
  telegram_help_message: string | null
  telegram_limit_reached_message: string | null
  telegram_after_analysis_cta: string | null
}

export default function TelegramAdminPage() {
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [users, setUsers]       = useState<TgUser[]>([])
  const [config, setConfig]     = useState<Config | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'config'>('stats')

  // User history drawer
  const [selectedUser, setSelectedUser]       = useState<TgUser | null>(null)
  const [userMeals, setUserMeals]             = useState<TgMeal[]>([])
  const [mealsLoading, setMealsLoading]       = useState(false)
  const [mealsError, setMealsError]           = useState<string | null>(null)
  const [detailMeal, setDetailMeal]           = useState<TgMeal | null>(null)

  // Editable config state
  const [freeLimit, setFreeLimit]     = useState('')
  const [linkedLimit, setLinkedLimit] = useState('')
  const [welcomeMsg, setWelcomeMsg]   = useState('')
  const [helpMsg, setHelpMsg]         = useState('')
  const [limitMsg, setLimitMsg]       = useState('')
  const [ctaMsg, setCtaMsg]           = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, cfgRes] = await Promise.all([
        fetch('/api/admin/telegram/stats'),
        fetch('/api/admin/telegram/config'),
      ])
      if (!statsRes.ok) throw new Error('Gagal memuat statistik')
      if (!cfgRes.ok)   throw new Error('Gagal memuat konfigurasi')

      const statsData = await statsRes.json()
      const cfgData   = await cfgRes.json()

      setSummary(statsData.summary)
      setUsers(statsData.users)
      setConfig(cfgData.config)

      setFreeLimit(cfgData.config.telegram_free_daily_limit ?? '3')
      setLinkedLimit(cfgData.config.telegram_linked_daily_limit ?? '10')
      setWelcomeMsg(cfgData.config.telegram_welcome_message ?? '')
      setHelpMsg(cfgData.config.telegram_help_message ?? '')
      setLimitMsg(cfgData.config.telegram_limit_reached_message ?? '')
      setCtaMsg(cfgData.config.telegram_after_analysis_cta ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openUserHistory = async (u: TgUser) => {
    if (!u.userId) return
    setSelectedUser(u)
    setUserMeals([])
    setMealsError(null)
    setMealsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${u.userId}/meals`)
      if (!res.ok) throw new Error('Gagal memuat riwayat')
      const data = await res.json()
      setUserMeals(data.meals ?? [])
    } catch (e) {
      setMealsError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setMealsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_free_daily_limit:       freeLimit,
          telegram_linked_daily_limit:     linkedLimit,
          telegram_welcome_message:        welcomeMsg,
          telegram_help_message:           helpMsg,
          telegram_limit_reached_message:  limitMsg,
          telegram_after_analysis_cta:     ctaMsg,
        }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan konfigurasi')
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.username  ?? '').toLowerCase().includes(q) ||
      (u.firstName ?? '').toLowerCase().includes(q) ||
      (u.linkedTo  ?? '').toLowerCase().includes(q) ||
      u.telegramId.includes(q)
    )
  })

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Memuat data Telegram...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
        <button onClick={fetchData} className="ml-4 text-sm underline">Coba lagi</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telegram Bot</h1>
          <p className="text-sm text-gray-500 mt-1">Statistik, pengguna, dan konfigurasi bot Telegram Gizku</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['stats', 'users', 'config'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'stats' ? '📊 Statistik' : tab === 'users' ? '👥 Pengguna' : '⚙️ Konfigurasi'}
          </button>
        ))}
      </div>

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && summary && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Total Pengguna',  value: summary.totalTgUsers,   icon: '👥', color: 'blue'    },
              { label: 'Akun Terhubung', value: summary.linkedCount,     icon: '🔗', color: 'emerald' },
              { label: 'Belum Terhubung',value: summary.unlinkedCount,   icon: '🔓', color: 'amber'   },
              { label: 'Aktif Hari Ini', value: summary.activeToday,     icon: '⚡', color: 'violet'  },
              { label: 'Analisa 7 Hari', value: summary.weeklyTgMeals,   icon: '📸', color: 'rose'    },
              { label: 'Analisa 30 Hari',value: summary.monthlyTgMeals,  icon: '📅', color: 'indigo'  },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString('id-ID')}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tingkat Koneksi Akun</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${summary.totalTgUsers > 0 ? Math.round(summary.linkedCount / summary.totalTgUsers * 100) : 0}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-emerald-600 w-12 text-right">
                {summary.totalTgUsers > 0 ? Math.round(summary.linkedCount / summary.totalTgUsers * 100) : 0}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {summary.linkedCount} dari {summary.totalTgUsers} pengguna telah menghubungkan akun Gizku mereka
            </p>
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Cari username, nama, atau Telegram ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-400">{filteredUsers.length} pengguna</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pengguna</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Telegram ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Akun Gizku</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Analisa Hari Ini</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Terakhir Aktif</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bergabung</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        {search ? 'Tidak ada pengguna yang cocok.' : 'Belum ada pengguna Telegram.'}
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.telegramId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.firstName ?? '—'}</div>
                        {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.telegramId}</td>
                      <td className="px-4 py-3">
                        {u.linkedTo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            🔗 {u.linkedTo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Belum terhubung
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 text-violet-700 font-semibold text-sm tabular-nums">
                          {u.dailyCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.lastUsedDate ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.userId ? (
                          <button
                            onClick={() => openUserHistory(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            📋 Lihat
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIG TAB ── */}
      {activeTab === 'config' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Batas Analisa Harian</h3>
              <p className="text-xs text-gray-400 mb-4">Pengguna yang menghubungkan akun mendapat kuota lebih besar.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pengguna bebas (belum login)</label>
                  <input
                    type="number" min="1" max="100"
                    value={freeLimit}
                    onChange={e => setFreeLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pengguna terhubung (sudah login)</label>
                  <input
                    type="number" min="1" max="100"
                    value={linkedLimit}
                    onChange={e => setLinkedLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {[
              { label: 'Pesan Selamat Datang (/start)', sublabel: 'Kosongkan untuk menggunakan teks default.', value: welcomeMsg, setter: setWelcomeMsg, rows: 3 },
              { label: 'Pesan Bantuan (/help)', sublabel: 'Kosongkan untuk menggunakan teks default.', value: helpMsg, setter: setHelpMsg, rows: 4 },
              { label: 'Pesan Batas Tercapai', sublabel: 'Gunakan {used} dan {limit} sebagai variabel.', value: limitMsg, setter: setLimitMsg, rows: 3 },
              { label: 'CTA Setelah Analisa (untuk user belum login)', sublabel: 'Ditampilkan di bawah hasil analisa untuk mendorong user login.', value: ctaMsg, setter: setCtaMsg, rows: 3 },
            ].map(({ label, sublabel, value, setter, rows }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
                <p className="text-xs text-gray-400 mb-2">{sublabel}</p>
                <textarea
                  rows={rows}
                  value={value}
                  onChange={e => setter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
                  placeholder="(Gunakan teks default)"
                />
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
              {saved && <span className="text-sm text-emerald-600 font-medium">✅ Tersimpan!</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── USER HISTORY DRAWER ── */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={() => { setSelectedUser(null); setDetailMeal(null) }}
        >
          <div
            className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[88vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900 text-base">
                  Riwayat Analisa — {selectedUser.firstName ?? selectedUser.username ?? 'Pengguna'}
                </h2>
                {selectedUser.username && (
                  <p className="text-xs text-gray-400 mt-0.5">@{selectedUser.username} · ID {selectedUser.telegramId}</p>
                )}
              </div>
              <button
                onClick={() => { setSelectedUser(null); setDetailMeal(null) }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {mealsLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              )}
              {mealsError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{mealsError}</div>
              )}
              {!mealsLoading && !mealsError && userMeals.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🍽️</div>
                  <p className="text-sm font-medium">Belum ada riwayat analisa</p>
                </div>
              )}
              {!mealsLoading && userMeals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-3">{userMeals.length} catatan ditemukan</p>
                  {userMeals.map(meal => (
                    <button
                      key={meal.id}
                      onClick={() => setDetailMeal(meal)}
                      className="w-full text-left bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {meal.dishNames.length > 0 ? meal.dishNames.join(', ') : 'Makanan'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{fmtDateTime(meal.loggedAt)}</span>
                          <SourceBadge source={meal.source} size="xs" />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm text-gray-800">{meal.totalCalories}</div>
                        <div className="text-xs text-gray-400">kkal</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MEAL DETAIL MODAL (inside drawer) ── */}
      {detailMeal && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setDetailMeal(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-semibold text-gray-900 text-sm truncate">
                  {detailMeal.dishNames.join(', ') || 'Makanan'}
                </span>
                <SourceBadge source={detailMeal.source} size="sm" />
              </div>
              <button onClick={() => setDetailMeal(null)} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-gray-400">{fmtDateTime(detailMeal.loggedAt)}</p>

              {/* Nutrition summary */}
              <div className="grid grid-cols-4 gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                {[
                  { label: 'Kalori', value: String(detailMeal.totalCalories), unit: 'kkal', color: '#FF8A65' },
                  { label: 'Protein', value: `${parseFloat(detailMeal.totalProtein).toFixed(1)}`, unit: 'g', color: '#2ECC71' },
                  { label: 'Karbo', value: `${parseFloat(detailMeal.totalCarbs).toFixed(1)}`, unit: 'g', color: '#6B9FD4' },
                  { label: 'Lemak', value: `${parseFloat(detailMeal.totalFat).toFixed(1)}`, unit: 'g', color: '#81C784' },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="text-center">
                    <div className="font-bold text-sm tabular-nums" style={{ color }}>{value}</div>
                    <div className="text-xs text-gray-400">{unit}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Dishes */}
              {detailMeal.rawAnalysis?.dishes && detailMeal.rawAnalysis.dishes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Menu Terdeteksi</p>
                  <div className="space-y-2">
                    {detailMeal.rawAnalysis.dishes.map((d, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm text-gray-900">{d.name}</div>
                            <div className="text-xs text-gray-400">{d.portion}</div>
                          </div>
                          <div className="font-semibold text-sm text-orange-400">{d.calories} kkal</div>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span className="text-emerald-600">P: {d.protein}g</span>
                          <span className="text-blue-500">K: {d.carbs}g</span>
                          <span className="text-green-500">L: {d.fat}g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailMeal.rawAnalysis?.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 leading-relaxed">
                  💡 {detailMeal.rawAnalysis.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Source Badge Component ─────────────────────────────────────────────────────
function SourceBadge({ source, size = 'sm' }: { source: string; size?: 'xs' | 'sm' }) {
  const isTelegram = source === 'telegram'
  const base = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${
      isTelegram
        ? 'bg-blue-50 text-blue-600 border border-blue-100'
        : 'bg-gray-100 text-gray-500 border border-gray-200'
    } ${base}`}>
      {isTelegram ? '✈️' : '🌐'}
      {isTelegram ? 'Telegram' : 'Web'}
    </span>
  )
}
