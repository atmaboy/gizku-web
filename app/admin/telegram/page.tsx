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

      // Populate form
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
            {tab === 'stats'  ? '📊 Statistik' : tab === 'users' ? '👥 Pengguna' : '⚙️ Konfigurasi'}
          </button>
        ))}
      </div>

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && summary && (
        <div>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Total Pengguna',  value: summary.totalTgUsers,   icon: '👥', color: 'blue'    },
              { label: 'Akun Terhubung', value: summary.linkedCount,     icon: '🔗', color: 'emerald' },
              { label: 'Belum Terhubung',value: summary.unlinkedCount,   icon: '🔓', color: 'amber'   },
              { label: 'Aktif Hari Ini', value: summary.activeToday,     icon: '⚡', color: 'violet'  },
              { label: 'Analisa 7 Hari', value: summary.weeklyTgMeals,   icon: '📸', color: 'rose'    },
              { label: 'Analisa 30 Hari',value: summary.monthlyTgMeals,  icon: '📅', color: 'indigo'  },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString('id-ID')}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Linking rate */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
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
            {/* Limits */}
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

            {/* Messages */}
            {[
              {
                label: 'Pesan Selamat Datang (/start)',
                sublabel: 'Kosongkan untuk menggunakan teks default.',
                value: welcomeMsg, setter: setWelcomeMsg, rows: 3,
              },
              {
                label: 'Pesan Bantuan (/help)',
                sublabel: 'Kosongkan untuk menggunakan teks default.',
                value: helpMsg, setter: setHelpMsg, rows: 4,
              },
              {
                label: 'Pesan Batas Tercapai',
                sublabel: 'Gunakan {used} dan {limit} sebagai variabel.',
                value: limitMsg, setter: setLimitMsg, rows: 3,
              },
              {
                label: 'CTA Setelah Analisa (untuk user belum login)',
                sublabel: 'Ditampilkan di bawah hasil analisa untuk mendorong user login.',
                value: ctaMsg, setter: setCtaMsg, rows: 3,
              },
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
              {saved && (
                <span className="text-sm text-emerald-600 font-medium">✅ Tersimpan!</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
