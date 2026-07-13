'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import { IconMail } from '@/components/ui/icons'

type Category = 'bug' | 'saran' | 'lainnya'

const CATEGORY_LABEL: Record<Category, string> = {
  bug: 'Laporkan Bug',
  saran: 'Saran Fitur',
  lainnya: 'Lainnya',
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
}

export default function FeedbackPage() {
  const router = useRouter()
  const [category, setCategory] = useState<Category>('bug')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (message.trim().length < 10) { setError('Pesan minimal 10 karakter'); return }

    setLoading(true)
    try {
      const parts = [`[${CATEGORY_LABEL[category]}] ${message.trim()}`]
      if (contact.trim()) parts.push(`Kontak: ${contact.trim()}`)

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: parts.join('\n\n') }),
      })
      const data = await res.json()
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { setError(data.error || 'Gagal mengirim laporan'); return }

      toast.success('Masukan berhasil dikirim. Terima kasih!')
      setMessage('')
      setContact('')
      router.push('/main/settings')
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Kirim Masukan" onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-5 pb-10">
        <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2">Kategori</div>
        <div className="flex gap-2 mb-[18px] flex-wrap">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map(c => (
            <Chip key={c} label={CATEGORY_LABEL[c]} selected={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2">Pesan</div>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setError('') }}
            placeholder="Ceritakan bug yang kamu temui atau ide fitur yang kamu inginkan..."
            className="w-full box-border rounded-lg bg-sunken shadow-hairline border-none outline-none px-3.5 py-3 text-base text-primary resize-none mb-1.5"
            style={{ minHeight: 120 }}
          />
          {error ? <div className="text-xs text-danger mb-3.5">{error}</div> : <div className="mb-3.5" />}

          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-1.5">Email (opsional)</div>
          <div className="h-11 rounded-lg bg-sunken flex items-center gap-2.5 px-3.5 box-border mb-[22px]">
            <IconMail size={14} color="var(--color-text-tertiary)" />
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Untuk kami hubungi balik (opsional)"
              className="flex-1 bg-transparent border-none outline-none text-base text-primary placeholder:text-tertiary"
            />
          </div>

          <Button type="submit" loading={loading}>Kirim Masukan</Button>
        </form>
      </div>
    </div>
  )
}
