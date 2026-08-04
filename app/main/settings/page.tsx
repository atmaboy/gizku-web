'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import ListItem from '@/components/ui/ListItem'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import {
  IconTelegram, IconLock, IconMail, IconReport, IconInfo, IconLogout, IconGauge, IconHistory,
} from '@/components/ui/icons'

type Profile = {
  username: string
  email: string | null
  createdAt: string
  totalMeals: number
  telegramId: string | null
  telegramUsername: string | null
}

type LimitSummary = {
  dailyLimit: number
  used: number
  remaining: number
  activeTier: { label: string; expiresAt: string } | null
  featureEnabled: boolean
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}

function fmtJoined(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function fmtLimitDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [limitSummary, setLimitSummary] = useState<LimitSummary | null>(null)

  useEffect(() => {
    fetch('/api/user?action=profile', { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.json()
      })
      .then(data => { if (data?.user) setProfile(data.user) })
      .catch(() => {})

    fetch('/api/limit?action=summary', { headers: authHeaders(), cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setLimitSummary(data) })
      .catch(() => {})
  }, [router])

  function logout() {
    localStorage.removeItem('nl_token')
    localStorage.removeItem('nl_user')
    localStorage.removeItem('nl_must_change_password')
    router.replace('/login')
  }

  const initial = profile?.username?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div
        className="flex items-center justify-center pb-1.5"
        style={{ paddingTop: 'calc(58px + env(safe-area-inset-top, 0px))' }}
      >
        <span className="text-xl font-semibold text-primary tracking-tight">Gizku</span>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-8">
        <div className="text-2xl font-semibold text-primary my-2 mb-4">Pengaturan</div>

        <Card className="p-4 mb-4 flex items-center gap-3.5">
          <div className="w-[60px] h-[60px] rounded-full bg-brand flex items-center justify-center shrink-0">
            <span className="text-2xl font-semibold text-white">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-primary">@{profile?.username ?? '...'}</div>
            {profile ? (
              <>
                <div className="text-xs text-secondary mt-0.5">Terdaftar sejak {fmtJoined(profile.createdAt)}</div>
                <div className="text-xs text-secondary">{profile.totalMeals} Makanan Dianalisa</div>
              </>
            ) : (
              <>
                <div className="gizku-skeleton h-3 w-32 mt-1.5 mb-1" />
                <div className="gizku-skeleton h-3 w-24" />
              </>
            )}
          </div>
        </Card>

        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-bg-brand-tint)', color: 'var(--color-text-brand)' }}
            >
              <IconGauge size={16} />
            </div>
            <div className="text-base font-semibold text-primary">Limit Analisa Gambar</div>
          </div>

          {limitSummary ? (
            <>
              <div className="text-xs text-secondary mb-1">Limit harian saat ini</div>
              <div className="text-xl font-semibold text-primary mb-2.5">{limitSummary.dailyLimit} analisa/hari</div>

              <div className="h-2 rounded-pill bg-muted overflow-hidden mb-1.5">
                <div
                  className="h-full bg-brand rounded-pill"
                  style={{
                    width: `${limitSummary.dailyLimit > 0 ? Math.min(100, (limitSummary.used / limitSummary.dailyLimit) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="text-xs text-secondary mb-3.5">
                Terpakai {limitSummary.used} dari {limitSummary.dailyLimit} ({limitSummary.remaining} tersisa hari ini)
              </div>

              {limitSummary.featureEnabled && (
                limitSummary.activeTier ? (
                  <div
                    className="inline-flex items-center rounded-pill px-3 py-1.5 text-xs font-semibold mb-3.5"
                    style={{ background: 'var(--color-bg-brand-tint)', color: 'var(--color-text-brand)' }}
                  >
                    Paket {limitSummary.activeTier.label} aktif hingga {fmtLimitDate(limitSummary.activeTier.expiresAt)} (siklus 30 hari)
                  </div>
                ) : (
                  <div className="inline-flex items-center rounded-pill px-3 py-1.5 text-xs font-semibold mb-3.5 bg-muted text-secondary">
                    Limit dasar gratis — 3x analisa/hari
                  </div>
                )
              )}

              <Button onClick={() => router.push('/main/limit')}>Ajukan Penambahan Limit</Button>
            </>
          ) : (
            <>
              <div className="gizku-skeleton h-4 w-32 mb-2" />
              <div className="gizku-skeleton h-6 w-40 mb-3" />
              <div className="gizku-skeleton h-10 w-full" />
            </>
          )}
        </Card>

        <Card className="overflow-hidden mb-4">
          <ListItem
            label="Riwayat Penggunaan & Penambahan Limit"
            leadingIcon={<IconHistory size={16} />}
            onClick={() => router.push('/main/limit/riwayat')}
          />
        </Card>

        <Card className="overflow-hidden mb-4">
          <ListItem
            label="Pengaturan Koneksi Telegram"
            supporting={profile ? (profile.telegramId ? `Terhubung sebagai @${profile.telegramUsername}` : 'Belum terhubung') : undefined}
            leadingIcon={<IconTelegram size={16} />}
            onClick={() => router.push('/main/settings/telegram')}
          />
        </Card>

        <Card className="overflow-hidden mb-4">
          <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
            <ListItem label="Ubah Password" leadingIcon={<IconLock size={16} strokeWidth={1.8} />} onClick={() => router.push('/main/settings/change-password')} />
          </div>
          <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
            <ListItem label="Ubah Email" supporting={profile?.email ?? undefined} leadingIcon={<IconMail size={16} />} onClick={() => router.push('/main/settings/change-email')} />
          </div>
          <ListItem label="Kirim / Laporkan Masukan" leadingIcon={<IconReport size={16} />} onClick={() => router.push('/main/settings/feedback')} />
        </Card>

        <Card className="overflow-hidden mb-4">
          <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
            <ListItem label="Tentang Aplikasi" supporting="v1.2.0" leadingIcon={<IconInfo size={16} />} onClick={() => router.push('/main/settings/about')} />
          </div>
          <ListItem label="Logout" danger leadingIcon={<IconLogout size={16} />} showChevron={false} onClick={() => setLogoutConfirm(true)} />
        </Card>

        <div className="text-center text-2xs text-tertiary mt-3">© 2026 gizku.com</div>
      </div>

      <Dialog
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        title="Keluar dari akun?"
        description="Kamu perlu masuk kembali untuk melanjutkan pelacakan nutrisimu."
        actions={[
          { label: 'Ya, Keluar', variant: 'danger-outline', onClick: logout },
          { label: 'Batal', variant: 'outline', onClick: () => setLogoutConfirm(false) },
        ]}
      />
    </div>
  )
}
