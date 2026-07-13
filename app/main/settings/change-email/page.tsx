'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import TextField from '@/components/ui/TextField'
import Button from '@/components/ui/Button'
import { IconMail } from '@/components/ui/icons'

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
}

export default function ChangeEmailPage() {
  const router = useRouter()
  const [currentEmail, setCurrentEmail] = useState('')
  const [next, setNext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/user?action=profile', { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.json()
      })
      .then(data => { if (data?.user?.email) setCurrentEmail(data.user.email) })
      .catch(() => {})
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = next.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmed) { setError('Email tidak boleh kosong'); return }
    if (!emailRegex.test(trimmed)) { setError('Format email tidak valid'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/user?action=update_email', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { setError(data.error || 'Gagal menyimpan email'); return }

      toast.success('Email berhasil disimpan')
      setCurrentEmail(trimmed)
      setNext('')
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Ubah Email" onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-5 pb-10">
        <div className="mb-3.5">
          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-1.5">Email Saat Ini</div>
          <div className="h-11 rounded-lg bg-muted flex items-center gap-2.5 px-3.5 box-border">
            <IconMail size={14} color="var(--color-text-tertiary)" />
            <span className="flex-1 text-base text-secondary">{currentEmail || '—'}</span>
          </div>
        </div>

        <form onSubmit={submit}>
          <TextField
            label="Email Baru"
            leadingIcon={<IconMail size={14} color="var(--color-text-tertiary)" />}
            type="email"
            value={next}
            onChange={e => { setNext(e.target.value); setError('') }}
            placeholder="contoh@email.com"
            errorText={error}
          />

          <div className="mt-2">
            <Button type="submit" loading={loading}>Simpan Perubahan</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
