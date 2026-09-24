'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Activity, AlertOctagon, Bot, Calendar, Camera, Globe, History, Link2, RefreshCw, Save, Search, Send, Unlink, UserRound, Users,
  UtensilsCrossed,
} from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Avatar, Badge, Button, Card, Code, DataTable, EmptyState, FormField, Input, InputGroup, ListRow, Modal, Pagination,
  Progress, ResponsiveStat, Skeleton, Textarea, TrackedLink,
} from '@/components/admin/ui'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

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
  const [, setConfig]           = useState<Config | null>(null)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)

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
      toast.success('Konfigurasi bot tersimpan')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan konfigurasi')
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

  const q = search
  useEffect(() => { setPage(1) }, [q])
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const header = (
    <Alert
      variant="light"
      icon={Bot}
      action={<Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchData} loading={loading}>Muat Ulang</Button>}
    >
      Statistik, pengguna, dan konfigurasi bot Telegram Gizku.
    </Alert>
  )

  if (loading && !summary) return (
    <AdminPage title="Telegram Bot" breadcrumb={[{ label: 'Telegram Bot' }]}>
      {header}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-5 max-lg:gap-3">{[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[90px] rounded-md" />)}</div>
      <Skeleton className="h-[320px] rounded-md" />
    </AdminPage>
  )

  if (error) return (
    <AdminPage title="Telegram Bot" breadcrumb={[{ label: 'Telegram Bot' }]}>
      <Alert variant="danger" icon={AlertOctagon} title="Error:" action={<Button variant="outline-danger" size="sm" icon={RefreshCw} onClick={fetchData}>Coba lagi</Button>}>
        {error}
      </Alert>
    </AdminPage>
  )

  const linkPct = summary && summary.totalTgUsers > 0 ? Math.round(summary.linkedCount / summary.totalTgUsers * 100) : 0
  const userName = (u: TgUser) => u.firstName ?? u.username ?? 'Pengguna'
  const fmtJoin = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

  const textareas = [
    { id: 'tg-welcome', label: 'Pesan Selamat Datang (/start)', help: 'Kosongkan untuk menggunakan teks default.', value: welcomeMsg, setter: setWelcomeMsg, rows: 3 },
    { id: 'tg-help', label: 'Pesan Bantuan (/help)', help: 'Kosongkan untuk menggunakan teks default.', value: helpMsg, setter: setHelpMsg, rows: 4 },
    { id: 'tg-limit', label: 'Pesan Batas Tercapai', help: <>Gunakan <Code>{'{used}'}</Code> dan <Code>{'{limit}'}</Code> sebagai variabel.</>, value: limitMsg, setter: setLimitMsg, rows: 3 },
    { id: 'tg-cta', label: 'CTA Setelah Analisa (untuk user belum login)', help: 'Ditampilkan di bawah hasil analisa untuk mendorong user login.', value: ctaMsg, setter: setCtaMsg, rows: 3 },
  ]

  return (
    <AdminPage title="Telegram Bot" breadcrumb={[{ label: 'Telegram Bot' }]}>
      {header}

      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-5 max-lg:gap-3">
          <ResponsiveStat icon={Users}      iconTone="brand" label="Total Pengguna"  value={summary.totalTgUsers.toLocaleString('id-ID')} />
          <ResponsiveStat icon={Link2}      iconTone="green" label="Akun Terhubung"  value={summary.linkedCount.toLocaleString('id-ID')} />
          <ResponsiveStat icon={Unlink}     iconTone="sand"  label="Belum Terhubung" value={summary.unlinkedCount.toLocaleString('id-ID')} />
          <ResponsiveStat icon={Activity}   iconTone="honey" label="Aktif Hari Ini"  value={summary.activeToday.toLocaleString('id-ID')} />
          <ResponsiveStat icon={Camera}     iconTone="green" label="Analisa 7 Hari"  value={summary.weeklyTgMeals.toLocaleString('id-ID')} />
          <ResponsiveStat icon={Calendar}   iconTone="sand"  label="Analisa 30 Hari" value={summary.monthlyTgMeals.toLocaleString('id-ID')} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        <div className="xl:col-span-8 flex flex-col gap-5 max-lg:gap-4 min-w-0">
          {summary && (
            <Card title="Tingkat Koneksi Akun" icon={Link2}>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-primary tabular-nums leading-none">{linkPct}%</span>
                <span className="text-base text-secondary">pengguna bot sudah terhubung ke akun Gizku</span>
              </div>
              <Progress value={linkPct} height={12} className="mt-3" label="Tingkat koneksi akun" />
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm text-secondary">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="w-2.5 h-2.5 rounded-full bg-brand" />Terhubung {summary.linkedCount}</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="w-2.5 h-2.5 rounded-full bg-muted border border-border-strong" />Belum terhubung {summary.unlinkedCount}</span>
              </div>
            </Card>
          )}

          <Card
            title="Pengguna Bot"
            icon={Users}
            subtitle={`${filteredUsers.length} pengguna`}
            noPadding
            tools={
              <InputGroup prepend={<Search size={16} aria-hidden />} className="w-[300px] max-lg:w-full">
                <Input type="search" aria-label="Cari pengguna bot" placeholder="Cari username, nama, atau Telegram ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </InputGroup>
            }
            toolsClassName="max-lg:w-full max-lg:ml-0"
            footer={filteredUsers.length > PAGE_SIZE ? (
              <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} label={`Hal. ${currentPage} / ${totalPages} · ${filteredUsers.length} pengguna`} />
            ) : undefined}
          >
            <div className="max-lg:hidden">
              <DataTable
                rows={pageUsers}
                rowKey={u => u.telegramId}
                striped
                minWidth={860}
                emptyState={<EmptyState icon={Users} title={search ? 'Tidak ada pengguna yang cocok.' : 'Belum ada pengguna Telegram.'} />}
                columns={[
                  { key: 'u', header: 'Pengguna', render: u => (
                    <span className="flex items-center gap-2.5">
                      <Avatar name={userName(u)} size={30} tone="telegram" />
                      <span className="min-w-0">
                        <span className="block font-semibold">{u.firstName ?? '—'}</span>
                        {u.username && <span className="block text-sm text-secondary">@{u.username}</span>}
                      </span>
                    </span>
                  ) },
                  { key: 'id', header: 'Telegram ID', render: u => <Code>{u.telegramId}</Code> },
                  { key: 'a', header: 'Akun Gizku', render: u => u.linkedTo
                    ? (u.userId
                        ? <TrackedLink href={`/admin/users/${u.userId}`} className="text-link font-medium hover:underline">@{u.linkedTo}</TrackedLink>
                        : <span className="font-medium">@{u.linkedTo}</span>)
                    : <Badge variant="light">Belum terhubung</Badge> },
                  { key: 'd', header: 'Analisa Hari Ini', align: 'center', className: 'tabular-nums font-semibold', render: u => u.dailyCount },
                  { key: 'l', header: 'Terakhir Aktif', className: 'text-secondary whitespace-nowrap', render: u => u.lastUsedDate ?? '—' },
                  { key: 'j', header: 'Bergabung', className: 'text-secondary whitespace-nowrap', render: u => fmtJoin(u.createdAt) },
                  { key: 'h', header: <span className="sr-only">Riwayat</span>, render: u => u.userId
                    ? <Button variant="outline-primary" size="sm" icon={History} onClick={() => openUserHistory(u)}>Riwayat</Button>
                    : <span className="text-secondary">—</span> },
                ]}
              />
            </div>
            <div className="lg:hidden">
              {pageUsers.length === 0 && <EmptyState icon={Users} title={search ? 'Tidak ada pengguna yang cocok.' : 'Belum ada pengguna Telegram.'} />}
              {pageUsers.map(u => (
                <ListRow
                  key={u.telegramId}
                  onClick={u.userId ? () => openUserHistory(u) : undefined}
                  leading={<Avatar name={userName(u)} size={36} tone="telegram" />}
                  title={u.firstName ?? u.username ?? '—'}
                  meta={<>{u.username ? `@${u.username} · ` : ''}{u.linkedTo ? `Akun @${u.linkedTo}` : 'Belum terhubung'}</>}
                  trailing={
                    <span className="text-right">
                      <span className="block text-md font-bold tabular-nums">{u.dailyCount}</span>
                      <span className="block text-[11px] text-secondary">hari ini</span>
                    </span>
                  }
                />
              ))}
            </div>
          </Card>
        </div>

        <Card
          outline="brand"
          title="Konfigurasi Bot"
          icon={Bot}
          className="xl:col-span-4"
          footer={
            <div className="flex justify-end">
              <Button icon={Save} loading={saving} onClick={handleSaveConfig} className="max-lg:w-full">
                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </div>
          }
          bodyClassName="flex flex-col gap-4"
        >
          <div>
            <h3 className="text-base font-semibold text-primary">Batas Analisa Harian</h3>
            <p className="text-sm text-secondary mt-0.5 mb-3">Pengguna yang menghubungkan akun mendapat kuota lebih besar.</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Belum login" htmlFor="tg-free">
                <Input id="tg-free" type="number" inputMode="numeric" min="1" max="100" value={freeLimit} onChange={e => setFreeLimit(e.target.value)} />
              </FormField>
              <FormField label="Sudah login" htmlFor="tg-linked">
                <Input id="tg-linked" type="number" inputMode="numeric" min="1" max="100" value={linkedLimit} onChange={e => setLinkedLimit(e.target.value)} />
              </FormField>
            </div>
          </div>
          <hr className="border-border" />
          {textareas.map(t => (
            <FormField key={t.id} label={t.label} htmlFor={t.id} help={t.help}>
              <Textarea id={t.id} rows={t.rows} value={t.value} onChange={e => t.setter(e.target.value)} placeholder="(Gunakan teks default)" className="font-mono text-sm" />
            </FormField>
          ))}
        </Card>
      </div>

      {/* ── User history modal ── */}
      <Modal
        open={!!selectedUser}
        onClose={() => { setSelectedUser(null); setDetailMeal(null) }}
        title={<>Riwayat Analisa — {selectedUser ? userName(selectedUser) : ''}</>}
        size="lg"
        sheetOnMobile
      >
        {selectedUser?.username && <p className="text-sm text-secondary -mt-1 mb-3">@{selectedUser.username} · ID {selectedUser.telegramId}</p>}
        {mealsLoading && <div className="flex flex-col gap-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}</div>}
        {mealsError && <Alert variant="danger">{mealsError}</Alert>}
        {!mealsLoading && !mealsError && userMeals.length === 0 && (
          <EmptyState icon={UtensilsCrossed} title="Belum ada riwayat analisa" />
        )}
        {!mealsLoading && userMeals.length > 0 && (
          <>
            <p className="text-sm text-secondary mb-2">{userMeals.length} catatan ditemukan</p>
            <ul className="list-none m-0 p-0 border border-border rounded-md overflow-hidden">
              {userMeals.map(meal => (
                <li key={meal.id}>
                  <ListRow
                    onClick={() => setDetailMeal(meal)}
                    title={meal.dishNames.length > 0 ? meal.dishNames.join(', ') : 'Makanan'}
                    meta={<span className="inline-flex items-center gap-2">{fmtDateTime(meal.loggedAt)} <SourceBadge source={meal.source} /></span>}
                    trailing={<span className="text-right"><span className="block font-semibold tabular-nums">{meal.totalCalories}</span><span className="block text-xs text-secondary">kkal</span></span>}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      {/* ── Meal detail modal ── */}
      <Modal
        open={!!detailMeal}
        onClose={() => setDetailMeal(null)}
        title={detailMeal ? (detailMeal.dishNames.join(', ') || 'Makanan') : ''}
        size="md"
        headerAction={detailMeal ? <SourceBadge source={detailMeal.source} /> : undefined}
      >
        {detailMeal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">{fmtDateTime(detailMeal.loggedAt)}</p>
            <div className="grid grid-cols-4 gap-2 bg-sunken border border-border rounded-md p-3">
              {[
                { label: 'Kalori', value: String(detailMeal.totalCalories), unit: 'kkal', cls: 'text-kcal' },
                { label: 'Protein', value: `${parseFloat(detailMeal.totalProtein).toFixed(1)}`, unit: 'g', cls: 'text-protein' },
                { label: 'Karbo', value: `${parseFloat(detailMeal.totalCarbs).toFixed(1)}`, unit: 'g', cls: 'text-carbs' },
                { label: 'Lemak', value: `${parseFloat(detailMeal.totalFat).toFixed(1)}`, unit: 'g', cls: 'text-fat' },
              ].map(({ label, value, unit, cls }) => (
                <div key={label} className="text-center">
                  <div className={cn('font-bold text-md tabular-nums', cls)}>{value}</div>
                  <div className="text-xs text-secondary">{unit}</div>
                  <div className="text-sm text-bark-700 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {detailMeal.rawAnalysis?.dishes && detailMeal.rawAnalysis.dishes.length > 0 && (
              <div>
                <p className="text-base font-semibold text-primary mb-2">Menu Terdeteksi</p>
                <ul className="list-none m-0 p-0 flex flex-col gap-2">
                  {detailMeal.rawAnalysis.dishes.map((d, i) => (
                    <li key={i} className="bg-sunken border border-border rounded-sm px-3 py-2">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="font-medium text-base text-primary">{d.name}</div>
                          <div className="text-sm text-secondary">{d.portion}</div>
                        </div>
                        <div className="font-semibold text-base text-kcal whitespace-nowrap">{d.calories} kkal</div>
                      </div>
                      <div className="flex gap-3 mt-1 text-sm">
                        <span className="text-protein">P: {d.protein}g</span>
                        <span className="text-carbs">K: {d.carbs}g</span>
                        <span className="text-fat">L: {d.fat}g</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detailMeal.rawAnalysis?.notes && (
              <Alert variant="light" icon={UserRound}>{detailMeal.rawAnalysis.notes}</Alert>
            )}
          </div>
        )}
      </Modal>
    </AdminPage>
  )
}

// ── Source Badge Component ─────────────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const isTelegram = source === 'telegram'
  const Icon = isTelegram ? Send : Globe
  return (
    <span className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium bg-muted text-secondary whitespace-nowrap">
      <Icon size={11} aria-hidden className={isTelegram ? 'text-tgc-700' : undefined} />
      {isTelegram ? 'Telegram' : 'Web'}
    </span>
  )
}
