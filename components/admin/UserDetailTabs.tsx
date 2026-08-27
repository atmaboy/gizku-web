'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
    setLoading(false)
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

  return (
    <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] px-5 pt-1">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-2.5 pt-3.5 text-sm font-medium border-b-2 mr-6 transition ${
            activeTab === 'config' ? 'border-[#2ECC71] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >Konfigurasi</button>
        <button
          onClick={() => { setActiveTab('reset'); setResetDone(false) }}
          className={`pb-2.5 pt-3.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'reset' ? 'border-red-500 text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Reset Password
          {user.mustChangePassword && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">!</span>
          )}
        </button>
      </div>

      {/* Tab: Konfigurasi */}
      {activeTab === 'config' && (
        <div className="p-5 space-y-5">
          <div className="bg-[#F9FAFB] rounded-xl p-3.5 space-y-2">
            <p className="text-sm font-semibold text-[#111827]">Closed Beta Tester Android</p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B7280]">Status opt-in</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                user.betaOptinAndroid ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}>
                {user.betaOptinAndroid ? 'Ikut' : 'Tidak'}
              </span>
            </div>
            {user.betaOptinAndroid && (
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">Opt-in pada</span>
                <span className="text-[#111827]">{fmtAudit(user.betaOptinAndroidAt) ?? '—'}</span>
              </div>
            )}
            <p className="text-[11.5px] text-[#9CA3AF] leading-relaxed pt-0.5">
              Data ini diambil dari persetujuan user saat registrasi, digunakan untuk mendaftarkan email ke Google Play Console.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#111827]">Limit Harian (foto/hari)</label>
            <div className="flex gap-2">
              <input
                type="number" min={1} max={9999}
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder={`Default global: ${globalLimit}`}
                className="flex-1 border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-base bg-white text-[#111827]
                  placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
              />
              {limit && (
                <button
                  onClick={() => setLimit('')}
                  title="Reset ke global"
                  className="text-xs border border-[#E5E7EB] px-3 rounded-xl hover:bg-[#F3F4F6] text-[#6B7280] transition min-h-[44px]"
                >↺</button>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">Kosongkan untuk mengikuti limit global ({globalLimit}/hari)</p>
          </div>

          <button
            onClick={askSave}
            className="w-full bg-[#2ECC71] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#28B765] transition min-h-[48px]"
          >
            Simpan Perubahan
          </button>

          <button
            onClick={askToggleActive}
            className={`w-full py-3 rounded-xl text-sm font-medium border transition min-h-[48px] ${
              user.isActive
                ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                : 'text-[#2ECC71] border-[#BBF7D0] hover:bg-[#F0FDF4]'
            }`}
          >
            {user.isActive ? 'Nonaktifkan User' : 'Aktifkan User'}
          </button>

          <div className="border-t border-[#E5E7EB] pt-4">
            <p className="text-xs text-[#6B7280] mb-3">Zona Berbahaya</p>
            <button
              onClick={askDelete}
              className="w-full py-3 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition min-h-[48px]"
            >
              Hapus User Permanen
            </button>
          </div>
        </div>
      )}

      {/* Tab: Reset Password */}
      {activeTab === 'reset' && (
        <div className="p-5 space-y-4">
          <div className="bg-[#F9FAFB] rounded-xl p-3.5 space-y-2 text-xs">
            <p className="font-medium text-[#111827] text-sm">Riwayat Password</p>
            <div className="flex justify-between text-[#6B7280]">
              <span>Terakhir diubah</span>
              <span className="text-[#111827] font-medium">{fmtAudit(user.passwordChangedAt) ?? '—'}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Diubah oleh</span>
              <span>
                {user.passwordChangedBy === 'admin' ? (
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    Admin{user.adminResetBy ? ` (${user.adminResetBy})` : ''}
                  </span>
                ) : user.passwordChangedBy === 'user' ? (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">User sendiri</span>
                ) : (
                  <span className="text-[#9CA3AF] italic">—</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Status wajib ganti</span>
              <span>
                {user.mustChangePassword ? (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ Belum diganti</span>
                ) : (
                  <span className="bg-[#D4F5E4] text-[#1F9D57] px-2 py-0.5 rounded-full font-medium">✓ Normal</span>
                )}
              </span>
            </div>
          </div>

          {resetDone ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-3xl">🔐</div>
              <p className="text-sm font-medium text-[#111827]">Password berhasil direset!</p>
              <p className="text-xs text-[#6B7280]">User @{user.username} wajib mengganti password saat login berikutnya.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#111827]">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 pr-10 text-base bg-white text-[#111827]
                      placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition w-8 h-8 flex items-center justify-center"
                    aria-label={showNewPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                    tabIndex={-1}
                  >
                    {showNewPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#111827]">Konfirmasi Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className={`w-full border rounded-xl px-3 py-2.5 pr-10 text-base bg-white text-[#111827]
                      placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition ${
                      pwdMismatch ? 'border-red-300 focus:ring-red-200' : 'border-[#E5E7EB] focus:ring-red-300 focus:border-transparent'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition w-8 h-8 flex items-center justify-center"
                    aria-label={showConfirmPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                    tabIndex={-1}
                  >
                    {showConfirmPwd ? '🙈' : '👁'}
                  </button>
                </div>
                {pwdMismatch && <p className="text-xs text-red-500">Password tidak cocok</p>}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-medium">⚠ Perhatian</p>
                <p>Setelah direset, user akan dipaksa mengganti password saat login berikutnya. Beritahu user password sementara ini secara langsung.</p>
              </div>

              <button
                onClick={askResetPassword}
                disabled={pwdMismatch || newPassword.length < 6}
                className="w-full py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              >
                🔑 Reset Password User
              </button>
            </>
          )}
        </div>
      )}

      <ConfirmPasswordModal request={confirm} loading={loading} onCancel={() => setConfirm(null)} />
    </div>
  )
}
