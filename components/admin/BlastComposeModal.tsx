'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const MAX_TARGETS = 10

type Estimate = { targeted: number; withToken: number; platforms: { ios: number; android: number } }

export default function BlastComposeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [batchName, setBatchName] = useState('')
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all')
  const [usernames, setUsernames] = useState<string[]>([])
  const [usernameInput, setUsernameInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const q = usernameInput.trim()
    if (q.length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/blast?action=lookup_username&q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setSuggestions((d.usernames ?? []).filter((u: string) => !usernames.includes(u)))
    }, 250)
    return () => clearTimeout(t)
  }, [usernameInput, usernames])

  useEffect(() => {
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ target_type: targetType })
      if (targetType === 'specific') params.set('usernames', usernames.join(','))
      if (targetType === 'specific' && usernames.length === 0) { setEstimate({ targeted: 0, withToken: 0, platforms: { ios: 0, android: 0 } }); return }
      const res = await fetch(`/api/admin/blast?action=estimate&${params.toString()}`)
      const d = await res.json()
      setEstimate(d)
    }, 300)
    return () => clearTimeout(t)
  }, [targetType, usernames])

  function addUsername(u: string) {
    const clean = u.trim().toLowerCase()
    if (!clean) return
    if (usernames.includes(clean)) { setUsernameInput(''); return }
    if (usernames.length >= MAX_TARGETS) { toast.error(`Maksimum ${MAX_TARGETS} username per batch`); return }
    setUsernames(prev => [...prev, clean])
    setUsernameInput('')
    setSuggestions([])
  }
  function removeUsername(u: string) {
    setUsernames(prev => prev.filter(x => x !== u))
  }

  const scheduledAtIso = useMemo(() => {
    if (sendMode === 'now' || !date || !time) return null
    const iso = new Date(`${date}T${time}:00+07:00`)
    return isNaN(iso.getTime()) ? null : iso.toISOString()
  }, [sendMode, date, time])

  async function submit() {
    if (!batchName.trim()) return toast.error('Nama batch diperlukan')
    if (!title.trim()) return toast.error('Judul notifikasi diperlukan')
    if (!body.trim()) return toast.error('Isi pesan diperlukan')
    if (targetType === 'specific' && usernames.length === 0) return toast.error('Tambahkan minimal 1 username target')
    if (sendMode === 'schedule' && !scheduledAtIso) return toast.error('Tanggal dan waktu pengiriman diperlukan')

    setSubmitting(true)
    const res = await fetch('/api/admin/blast?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchName: batchName.trim(),
        title: title.trim(),
        body: body.trim(),
        targetType,
        targetUsernames: targetType === 'specific' ? usernames : undefined,
        scheduledAt: scheduledAtIso,
      }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      toast.success(sendMode === 'now' ? 'Notifikasi sedang dikirim' : 'Notifikasi dijadwalkan')
      onCreated()
    } else {
      toast.error(d.error)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white ring-1 ring-[#E5E7EB] shadow-xl flex flex-col w-full rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88vh] sm:max-w-lg">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB]">
          <h2 className="text-base font-semibold text-[#111827]">Kirim Notifikasi Baru</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-5">
          {/* Konten Notifikasi */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-3">Konten Notifikasi</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#111827]">Nama Batch (internal)</label>
                <input
                  value={batchName} onChange={e => setBatchName(e.target.value)}
                  placeholder="mis. Promo Ramadan 2026"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
                />
                <p className="text-xs text-[#6B7280]">Untuk memudahkan pencarian di riwayat batch. Tidak ditampilkan ke user.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#111827]">Judul Notifikasi</label>
                <input
                  value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                  placeholder="mis. Jangan lupa catat makan siangmu!"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#111827]">Isi Pesan</label>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)} maxLength={240} rows={3}
                  placeholder="Tulis isi pesan notifikasi…"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition resize-none"
                />
                <p className="text-xs text-[#9CA3AF] text-right">{body.length}/240</p>
              </div>
            </div>
          </div>

          {/* Target Penerima */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Target Penerima</h3>
            <p className="text-xs text-[#6B7280] mb-3">Pilih siapa yang akan menerima notifikasi ini.</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTargetType('all')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                  targetType === 'all' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >Seluruh User</button>
              <button
                onClick={() => setTargetType('specific')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                  targetType === 'specific' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >Username Tertentu</button>
            </div>

            {targetType === 'all' ? (
              <p className="text-xs text-[#6B7280]">Akan dikirim ke seluruh user aktif.</p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUsername(usernameInput) } }}
                    disabled={usernames.length >= MAX_TARGETS}
                    placeholder={usernames.length >= MAX_TARGETS ? 'Maksimum 10 username tercapai' : 'Ketik username lalu Enter…'}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition disabled:bg-[#F9FAFB]"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
                      {suggestions.map(s => (
                        <button
                          key={s} onClick={() => addUsername(s)}
                          className="w-full text-left px-3 py-2 text-sm text-[#111827] hover:bg-[#F0FDF4] transition"
                        >@{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                {usernames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {usernames.map(u => (
                      <span key={u} className="inline-flex items-center gap-1 text-xs bg-[#D4F5E4] text-[#1F9D57] px-2.5 py-1 rounded-full font-medium">
                        @{u}
                        <button onClick={() => removeUsername(u)} aria-label={`Hapus ${u}`} className="hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9CA3AF] italic">Belum ada username ditambahkan.</p>
                )}
                {usernames.length >= MAX_TARGETS && (
                  <p className="text-xs text-amber-600">Maksimum 10 username per batch tercapai.</p>
                )}
              </div>
            )}

            {estimate && (
              <p className="text-xs text-[#6B7280] mt-3">
                Estimasi penerima: <strong className="text-[#111827]">{estimate.targeted}</strong> user
                {' '}(<strong className="text-[#111827]">{estimate.withToken}</strong> dengan push token aktif
                {estimate.platforms.ios + estimate.platforms.android > 0 && (
                  <> — {estimate.platforms.ios} iOS / {estimate.platforms.android} Android</>
                )})
              </p>
            )}
          </div>

          {/* Waktu Pengiriman */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Waktu Pengiriman</h3>
            <p className="text-xs text-[#6B7280] mb-3">Kirim langsung atau jadwalkan untuk waktu tertentu.</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSendMode('now')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                  sendMode === 'now' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >Kirim Sekarang</button>
              <button
                onClick={() => setSendMode('schedule')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                  sendMode === 'schedule' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >Jadwalkan</button>
            </div>
            {sendMode === 'schedule' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-[#111827]">Tanggal</label>
                    <input
                      type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                      className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-[#111827]">Waktu</label>
                    <input
                      type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                </div>
                <p className="text-xs text-[#6B7280]">Waktu mengikuti zona waktu server admin (WIB).</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#E5E7EB] flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[48px]"
          >Batal</button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#2ECC71] text-white hover:bg-[#28B765] transition disabled:opacity-50 min-h-[48px]"
          >
            {submitting ? 'Mengirim…' : sendMode === 'now' ? 'Kirim Sekarang' : 'Jadwalkan'}
          </button>
        </div>
      </div>
    </div>
  )
}
