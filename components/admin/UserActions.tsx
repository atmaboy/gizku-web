'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import MealHistoryModal from './MealHistoryModal'

type U = {
  id: string
  username: string
  dailyLimit: number | null
  isActive: boolean
  passwordChangedAt?: Date | string | null
  passwordChangedBy?: string | null
  mustChangePassword?: boolean | null
  adminResetBy?: string | null
}

export default function UserActions({
  user,
  globalLimit,
  mobileCard = false,
}: {
  user: U
  globalLimit: number
  /** Saat true, render sebagai full-width button strip di mobile card */
  mobileCard?: boolean
}) {
  const [showEdit, setShowEdit]       = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeTab, setActiveTab]     = useState<'config' | 'reset'>('config')
  const [limit, setLimit]             = useState(user.dailyLimit?.toString() ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd]   = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [loading, setLoading]         = useState<string | null>(null)
  const [resetDone, setResetDone]     = useState(false)
  const router = useRouter()

  const tok = () =>
    document.cookie.split(';').find(c => c.includes('nl_admin_token'))?.split('=')[1] ?? ''

  function closeEdit() {
    setShowEdit(false)
    setActiveTab('config')
    setNewPassword('')
    setConfirmPassword('')
    setShowNewPwd(false)
    setShowConfirmPwd(false)
    setResetDone(false)
  }

  async function call(action: string, body: Record<string, unknown>) {
    setLoading(action)
    const r = await fetch(`/api/admin?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (r.ok) { toast.success('Berhasil'); router.refresh(); setShowEdit(false) }
    else toast.error(d.error)
    setLoading(null)
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (!confirm(`Reset password untuk user "${user.username}"? User wajib ganti password saat login berikutnya.`)) return

    setLoading('reset_password')
    const adminUsername = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('nl_admin_username='))
      ?.split('=')?.[1] ?? 'admin'

    const r = await fetch('/api/admin?action=reset_user_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ userId: user.id, newPassword, adminUsername }),
    })
    const d = await r.json()
    if (r.ok) {
      setResetDone(true)
      router.refresh()
    } else {
      toast.error(d.error)
    }
    setLoading(null)
  }

  async function deleteUser() {
    if (!confirm(`Hapus user "${user.username}"? Semua data akan ikut terhapus.`)) return
    setLoading('delete')
    const r = await fetch('/api/admin?action=delete_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ userId: user.id }),
    })
    const d = await r.json()
    if (r.ok) { toast.success('User dihapus'); router.refresh(); closeEdit() }
    else toast.error(d.error)
    setLoading(null)
  }

  const pwdMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  function fmtAudit(dt: Date | string | null | undefined) {
    if (!dt) return null
    return new Date(dt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <>
      {/* ══════════════════════════════════════════
          TRIGGER BUTTONS
          - Desktop (mobileCard=false): tombol kecil inline
          - Mobile card (mobileCard=true): full-width strip
          ══════════════════════════════════════════ */}
      {mobileCard ? (
        // Mobile card: dua tombol full-width di footer card
        <div className="flex w-full divide-x divide-[#F3F4F6]">
          <button
            onClick={() => setShowHistory(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors min-h-[48px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3h18v18H3z" rx="2"/>
              <path d="M16 8H8M16 12H8M11 16H8"/>
            </svg>
            Riwayat
          </button>
          <button
            onClick={() => { setActiveTab('config'); setShowEdit(true) }}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition-colors min-h-[48px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        </div>
      ) : (
        // Desktop: tombol kecil inline seperti semula
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(true)}
            title="Riwayat analisa makanan"
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#BFDBFE] text-[#3B82F6] hover:bg-[#EFF6FF] transition min-h-[36px]"
          >
            Riwayat
          </button>
          <button
            onClick={() => { setActiveTab('config'); setShowEdit(true) }}
            title="Edit konfigurasi user"
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[36px]"
          >
            Edit
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL EDIT USER
          ══════════════════════════════════════════ */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) closeEdit() }}
        >
          {/*
            Di mobile: sheet dari bawah (rounded-t-2xl, max-h-[90dvh])
            Di desktop: modal tengah (rounded-2xl, max-w-sm)
          */}
          <div className="bg-white ring-1 ring-[#E5E7EB] shadow-xl w-full max-w-sm
            rounded-t-2xl sm:rounded-2xl
            max-h-[90dvh] overflow-y-auto"
          >
            {/* Drag handle di mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E5E7EB] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 sm:pt-5 pb-0">
              <div>
                <h2 className="text-base font-semibold text-[#111827]">Edit User</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">@{user.username}</p>
              </div>
              <button
                onClick={closeEdit}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition"
                aria-label="Tutup"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E5E7EB] mt-4 px-6">
              <button
                onClick={() => setActiveTab('config')}
                className={`pb-2.5 text-sm font-medium border-b-2 mr-6 transition ${
                  activeTab === 'config'
                    ? 'border-[#2ECC71] text-[#111827]'
                    : 'border-transparent text-[#6B7280] hover:text-[#111827]'
                }`}
              >Konfigurasi</button>
              <button
                onClick={() => { setActiveTab('reset'); setResetDone(false) }}
                className={`pb-2.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'reset'
                    ? 'border-red-500 text-[#111827]'
                    : 'border-transparent text-[#6B7280] hover:text-[#111827]'
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
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6B7280]">Status saat ini:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.isActive
                      ? 'bg-[#D4F5E4] text-[#1F9D57]'
                      : 'bg-[#F3F4F6] text-[#6B7280]'
                  }`}>
                    {user.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
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
                  onClick={() => call('update_user', {
                    userId: user.id,
                    dailyLimit: limit === '' ? null : parseInt(limit),
                    isActive: user.isActive,
                  })}
                  disabled={loading === 'update_user'}
                  className="w-full bg-[#2ECC71] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#28B765] transition disabled:opacity-50 min-h-[48px]"
                >
                  {loading === 'update_user' ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>

                <button
                  onClick={() => call('update_user', {
                    userId: user.id,
                    dailyLimit: user.dailyLimit,
                    isActive: !user.isActive,
                  })}
                  disabled={loading === 'update_user'}
                  className={`w-full py-3 rounded-xl text-sm font-medium border transition disabled:opacity-50 min-h-[48px] ${
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
                    onClick={deleteUser}
                    disabled={loading === 'delete'}
                    className="w-full py-3 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50 min-h-[48px]"
                  >
                    {loading === 'delete' ? 'Menghapus…' : 'Hapus User Permanen'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Reset Password */}
            {activeTab === 'reset' && (
              <div className="p-6 space-y-4">
                <div className="bg-[#F9FAFB] rounded-xl p-3.5 space-y-2 text-xs">
                  <p className="font-medium text-[#111827] text-sm">Riwayat Password</p>
                  <div className="flex justify-between text-[#6B7280]">
                    <span>Terakhir diubah</span>
                    <span className="text-[#111827] font-medium">
                      {fmtAudit(user.passwordChangedAt) ?? '—'}
                    </span>
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
                    <button
                      onClick={closeEdit}
                      className="mt-2 text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] transition min-h-[40px]"
                    >Tutup</button>
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
                            pwdMismatch
                              ? 'border-red-300 focus:ring-red-200'
                              : 'border-[#E5E7EB] focus:ring-red-300 focus:border-transparent'
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
                      {pwdMismatch && (
                        <p className="text-xs text-red-500">Password tidak cocok</p>
                      )}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                      <p className="font-medium">⚠ Perhatian</p>
                      <p>Setelah direset, user akan dipaksa mengganti password saat login berikutnya. Beritahu user password sementara ini secara langsung.</p>
                    </div>

                    <button
                      onClick={handleResetPassword}
                      disabled={loading === 'reset_password' || pwdMismatch || newPassword.length < 6}
                      className="w-full py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
                    >
                      {loading === 'reset_password' ? 'Mereset…' : '🔑 Reset Password User'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Popup Riwayat Analisa ── */}
      {showHistory && (
        <MealHistoryModal
          userId={user.id}
          username={user.username}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  )
}
