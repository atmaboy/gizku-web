'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import TextField from '@/components/ui/TextField'
import Button from '@/components/ui/Button'
import { IconLock } from '@/components/ui/icons'

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!current) nextErrors.current = 'Password saat ini diperlukan'
    if (next.length < 6) nextErrors.next = 'Password baru minimal 6 karakter'
    if (confirm !== next) nextErrors.confirm = 'Konfirmasi password tidak cocok'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/user?action=change_password', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { setErrors({ current: data.error || 'Gagal mengubah password' }); return }

      toast.success('Password berhasil diubah. Silakan masuk kembali.')
      localStorage.removeItem('nl_token')
      localStorage.removeItem('nl_user')
      localStorage.removeItem('nl_must_change_password')
      router.replace('/login')
    } catch {
      setErrors({ current: 'Tidak dapat terhubung ke server' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Ubah Password" onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-5 pb-10">
        <div className="text-sm text-secondary leading-normal mb-5">
          Gunakan password baru yang kuat dan belum pernah dipakai sebelumnya.
        </div>

        <form onSubmit={submit}>
          <TextField
            label="Password Saat Ini"
            isPassword
            leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
            value={current}
            onChange={e => { setCurrent(e.target.value); setErrors(er => ({ ...er, current: undefined })) }}
            placeholder="Masukkan password saat ini"
            errorText={errors.current}
          />
          <TextField
            label="Password Baru"
            isPassword
            leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
            value={next}
            onChange={e => { setNext(e.target.value); setErrors(er => ({ ...er, next: undefined })) }}
            placeholder="Minimal 6 karakter"
            errorText={errors.next}
          />
          <TextField
            label="Konfirmasi Password Baru"
            isPassword
            leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setErrors(er => ({ ...er, confirm: undefined })) }}
            placeholder="Ulangi password baru"
            errorText={errors.confirm}
          />

          <div className="mt-2">
            <Button type="submit" loading={loading}>Simpan Perubahan</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
