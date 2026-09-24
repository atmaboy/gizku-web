'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound, Lock, RotateCcw, Settings2, Shield, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import {
  AddonButton, Alert, Badge, Button, Card, FormField, Input, InputGroup, KeyValue, Tabs,
} from '@/components/admin/ui'
import ConfirmPasswordModal, { type ConfirmRequest } from './ConfirmPasswordModal'

type U = {
  id: string
  username: string
  dailyLimit: number | null
  isActive: boolean
  passwordChangedAt?: Date | string | null
  passwordChangedBy?: string | null
  mustChangePassword?: boolean | null
  adminResetBy?: string | null
  betaOptinAndroid?: boolean | null
  betaOptinAndroidAt?: Date | string | null
}

export default function UserDetailTabs({ user, globalLimit }: { user: U; globalLimit: number }) {
  const [activeTab, setActiveTab] = useState<'config' | 'reset'>('config')
  const [limit, setLimit] = useState(user.dailyLimit?.toString() ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const pwdMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  function fmtAudit(dt: Date | string | null | undefined) {
    if (!dt) return null
    return new Date(dt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  async function runConfirmed(action: string, body: Record<string, unknown>, onSuccess?: () => void) {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok) {
        toast.success('Berhasil')
        setConfirm(null)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(d.error)
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setLoading(false)
    }
  }

  function askSave() {
    setConfirm({
      title: 'Simpan perubahan konfigurasi?',
      message: `Limit harian untuk @${user.username} akan diperbarui.`,
      confirmLabel: 'Simpan',
      severity: 'green',
      onConfirm: adminPassword => runConfirmed('update_user', {
        userId: user.id,
        dailyLimit: limit === '' ? null : parseInt(limit),
        isActive: user.isActive,
        adminPassword,
      }),
    })
  }

  function askToggleActive() {
    setConfirm({
      title: user.isActive ? `Nonaktifkan @${user.username}?` : `Aktifkan @${user.username}?`,
      message: user.isActive
        ? 'User tidak akan bisa login sampai diaktifkan kembali.'
        : 'User akan bisa login kembali seperti biasa.',
      confirmLabel: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
      severity: user.isActive ? 'orange' : 'green',
      onConfirm: adminPassword => runConfirmed('update_user', {
        userId: user.id,
        dailyLimit: user.dailyLimit,
        isActive: !user.isActive,
        adminPassword,
      }),
    })
  }

  function askDelete() {
    setConfirm({
      title: `Hapus user @${user.username} permanen?`,
      message: 'Semua data (riwayat makanan, dsb) akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus Permanen',
      severity: 'red',
      onConfirm: adminPassword => runConfirmed('delete_user', { userId: user.id, adminPassword }, () => {
        router.push('/admin/users')
      }),
    })
  }

  function askResetPassword() {
    if (!newPassword || newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return }
    setConfirm({
      title: `Reset password @${user.username}?`,
      message: 'User wajib mengganti password ini saat login berikutnya. Pastikan Anda telah mencatat password sementara ini.',
      confirmLabel: 'Reset Password',
      severity: 'red',
      onConfirm: adminPassword => runConfirmed('reset_user_password', {
        userId: user.id, newPassword, adminPassword,
      }, () => setResetDone(true)),
    })
  }

  const eyeBtn = (shown: boolean, toggle: () => void) => (
    <AddonButton label={shown ? 'Sembunyikan password' : 'Tampilkan password'} onClick={toggle}>
      {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
    </AddonButton>
  )

  return (
    <Card
      icon={Settings2}
      title="Pengaturan Akun"
      headerClassName="max-lg:flex-col max-lg:items-stretch"
      toolsClassName="max-lg:w-full max-lg:ml-0"
      tools={
        <Tabs
          variant="pills"
          ariaLabel="Pengaturan akun"
          idPrefix="user-tabs"
          value={activeTab}
          onChange={v => { setActiveTab(v); if (v === 'reset') setResetDone(false) }}
          items={[
            { value: 'config', label: 'Konfigurasi' },
            {
              value: 'reset', label: 'Reset Password',
              badge: user.mustChangePassword ? <Badge variant="warning" pill size="sm" title="User wajib ganti password">!</Badge> : undefined,
            },
          ]}
        />
      }
    >
      {activeTab === 'config' && (
        <div role="tabpanel" id="user-tabs-panel-config" aria-labelledby="user-tabs-tab-config" className="flex flex-col gap-5">
          <Alert variant="light" icon={Shield}>
            Setiap perubahan pada akun user wajib dikonfirmasi dengan password admin.
          </Alert>

          <div className="bg-sunken border border-border rounded-md p-3.5">
            <p className="flex items-center gap-2 text-base font-semibold text-primary">
              <Smartphone size={16} className="text-secondary" aria-hidden />Closed Beta Tester Android
            </p>
            <KeyValue
              dense
              className="mt-1"
              items={[
                { label: 'Status opt-in', value: user.betaOptinAndroid ? <Badge variant="soft">Ikut</Badge> : <Badge variant="light">Tidak</Badge> },
                ...(user.betaOptinAndroid ? [{ label: 'Opt-in pada', value: fmtAudit(user.betaOptinAndroidAt) ?? '—' }] : []),
              ]}
            />
            <p className="text-sm text-secondary leading-normal mt-1">
              Data ini diambil dari persetujuan user saat registrasi, digunakan untuk mendaftarkan email ke Google Play Console.
            </p>
          </div>

          <FormField
            label="Limit Harian (foto/hari)"
            htmlFor="user-limit"
            help={`Kosongkan untuk mengikuti limit global (${globalLimit}/hari).`}
          >
            <div className="flex gap-2 lg:max-w-[420px]">
              <Input
                id="user-limit"
                type="number" min={1} max={9999}
                inputMode="numeric"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder={`Default global: ${globalLimit}`}
              />
              <Button
                variant="outline"
                aria-label="Reset ke limit global"
                title="Reset ke limit global"
                onClick={() => setLimit('')}
                disabled={!limit}
                className="px-3 shrink-0"
              >
                <RotateCcw size={16} aria-hidden />
              </Button>
            </div>
          </FormField>

          <div className="flex flex-wrap gap-2 max-lg:flex-col">
            <Button icon={Lock} onClick={askSave} className="max-lg:w-full">Simpan Perubahan</Button>
            <Button variant={user.isActive ? 'outline-warning' : 'outline-primary'} icon={Lock} onClick={askToggleActive} className="max-lg:w-full">
              {user.isActive ? 'Nonaktifkan User' : 'Aktifkan User'}
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-base font-semibold text-rose-600">Zona Berbahaya</h3>
            <p className="text-sm text-secondary mt-1 mb-3 leading-normal">
              Menghapus user juga menghapus seluruh riwayat makanan dan datanya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <Button variant="outline-danger" icon={Trash2} onClick={askDelete} className="max-lg:w-full">Hapus User Permanen</Button>
          </div>
        </div>
      )}

      {activeTab === 'reset' && (
        <div role="tabpanel" id="user-tabs-panel-reset" aria-labelledby="user-tabs-tab-reset" className="flex flex-col gap-4">
          <div className="bg-sunken border border-border rounded-md p-3.5">
            <p className="text-base font-semibold text-primary">Riwayat Password</p>
            <KeyValue
              dense
              className="mt-1"
              items={[
                { label: 'Terakhir diubah', value: fmtAudit(user.passwordChangedAt) ?? '—' },
                {
                  label: 'Diubah oleh',
                  value: user.passwordChangedBy === 'admin'
                    ? <Badge variant="honeysoft">Admin{user.adminResetBy ? ` (${user.adminResetBy})` : ''}</Badge>
                    : user.passwordChangedBy === 'user'
                      ? <Badge variant="soft">User sendiri</Badge>
                      : <span className="text-secondary font-normal">—</span>,
                },
                {
                  label: 'Status wajib ganti',
                  value: user.mustChangePassword ? <Badge variant="warning">Belum diganti</Badge> : <Badge variant="success">Normal</Badge>,
                },
              ]}
            />
          </div>

          {resetDone ? (
            <div className="text-center py-6 flex flex-col items-center gap-2">
              <ShieldCheck size={32} className="text-brand" aria-hidden />
              <p className="text-base font-semibold text-primary">Password berhasil direset!</p>
              <p className="text-sm text-secondary">User @{user.username} wajib mengganti password saat login berikutnya.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField label="Password Baru" htmlFor="reset-new">
                  <InputGroup append={eyeBtn(showNewPwd, () => setShowNewPwd(v => !v))}>
                    <Input
                      id="reset-new"
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      autoComplete="new-password"
                    />
                  </InputGroup>
                </FormField>
                <FormField label="Konfirmasi Password" htmlFor="reset-confirm" error={pwdMismatch ? 'Password tidak cocok' : undefined}>
                  <InputGroup append={eyeBtn(showConfirmPwd, () => setShowConfirmPwd(v => !v))}>
                    <Input
                      id="reset-confirm"
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      autoComplete="new-password"
                      invalid={pwdMismatch}
                    />
                  </InputGroup>
                </FormField>
              </div>

              <Alert variant="warning" title="Perhatian.">
                Setelah direset, user akan dipaksa mengganti password saat login berikutnya. Beritahu user password sementara ini secara langsung.
              </Alert>

              <div>
                <Button
                  variant="danger"
                  icon={KeyRound}
                  onClick={askResetPassword}
                  disabled={pwdMismatch || newPassword.length < 6}
                  className="max-lg:w-full"
                >
                  Reset Password User
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmPasswordModal request={confirm} loading={loading} onCancel={() => setConfirm(null)} />
    </Card>
  )
}
