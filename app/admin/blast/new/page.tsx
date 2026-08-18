'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const MAX_TARGETS = 10
const MAX_EMAIL_TARGETS = 100
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_BODY_MAX = 5000

type Estimate = { targeted: number; reachable: number; platforms: { ios: number; android: number } }
type Channel = 'push' | 'telegram' | 'email'
type FromAddress = 'support' | 'marketing'

const SENDER_OPTIONS: { value: FromAddress; label: string; address: string; hint: string }[] = [
  { value: 'support', label: 'Gizku Support', address: 'support@gizku.com', hint: 'Reachout informasi penting ke user (mis. pengumuman, insiden, verifikasi).' },
  { value: 'marketing', label: 'Gizku Marketing', address: 'marketing@gizku.com', hint: 'Keperluan promosional (mis. fitur baru, promo, campaign).' },
]

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        selected ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
      }`}
    >
      {label}
    </button>
  )
}

export default function BlastComposePage() {
  const router = useRouter()
  const [channel, setChannel] = useState<Channel>('push')
  const [batchName, setBatchName] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [fromAddress, setFromAddress] = useState<FromAddress>('support')
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all')
  const [usernames, setUsernames] = useState<{ value: string; label: string }[]>([])
  const [usernameInput, setUsernameInput] = useState('')
  const [suggestions, setSuggestions] = useState<{ value: string; label: string }[]>([])
  const [resolving, setResolving] = useState(false)
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now')
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isEmail = channel === 'email'
  const maxTargets = isEmail ? MAX_EMAIL_TARGETS : MAX_TARGETS
  const bodyMax = isEmail ? EMAIL_BODY_MAX : 300

  useEffect(() => {
    if (isEmail) return // email channel: input alamat langsung, tidak ada lookup server
    const q = usernameInput.trim()
    if (q.length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/blast?action=lookup_username&channel=${channel}&q=${encodeURIComponent(q)}`)
        const d = await res.json()
        const addedValues = usernames.map(u => u.value)
        if (res.ok) setSuggestions((d.suggestions ?? []).filter((s: { value: string }) => !addedValues.includes(s.value)))
      } catch {
        // pencarian username gagal — biarkan daftar saran kosong, tidak fatal
      }
    }, 250)
    return () => clearTimeout(t)
  }, [usernameInput, usernames, channel, isEmail])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (targetType === 'specific' && usernames.length === 0) {
        setEstimate({ targeted: 0, reachable: 0, platforms: { ios: 0, android: 0 } })
        return
      }
      try {
        const params = new URLSearchParams({ channel, target_type: targetType })
        if (targetType === 'specific') params.set('usernames', usernames.map(u => u.value).join(','))
        const res = await fetch(`/api/admin/blast?action=estimate&${params.toString()}`)
        const d = await res.json()
        if (res.ok) setEstimate(d)
      } catch {
        // estimasi gagal dimuat — biarkan nilai sebelumnya, tidak fatal
      }
    }, 300)
    return () => clearTimeout(t)
  }, [channel, targetType, usernames])

  function commitUsername(resolved: { value: string; label: string }) {
    if (usernames.some(u => u.value === resolved.value)) { setUsernameInput(''); return }
    if (usernames.length >= maxTargets) { toast.error(`Maksimum ${maxTargets} ${isEmail ? 'alamat email' : 'username'} per batch`); return }
    setUsernames(prev => [...prev, resolved])
    setUsernameInput('')
    setSuggestions([])
  }

  /** Klik dari daftar saran — value sudah pasti username app yang valid. */
  function addFromSuggestion(s: { value: string; label: string }) {
    commitUsername(s)
  }

  /**
   * Enter tanpa memilih saran. Untuk email: validasi format di client, tanpa
   * ke server (alamat boleh tidak terhubung ke akun manapun). Untuk push/
   * telegram: dicocokkan ke identitas channel yang dipilih di server.
   */
  async function addByRawInput(raw: string) {
    const clean = raw.trim().replace(/^@/, '')
    if (!clean) return

    if (isEmail) {
      const email = clean.toLowerCase()
      if (!EMAIL_RE.test(email)) { toast.error(`Alamat email tidak valid: ${clean}`); return }
      commitUsername({ value: email, label: email })
      return
    }

    setResolving(true)
    try {
      const res = await fetch(`/api/admin/blast?action=resolve_username&channel=${channel}&value=${encodeURIComponent(clean)}`)
      const d = await res.json()
      if (res.ok) commitUsername(d)
      else toast.error(d.error)
    } catch {
      toast.error('Gagal memeriksa username, coba lagi')
    } finally {
      setResolving(false)
    }
  }

  function removeUsername(value: string) {
    setUsernames(prev => prev.filter(x => x.value !== value))
  }

  function resetForm() {
    setChannel('push'); setBatchName(''); setTitle(''); setBody(''); setFromAddress('support')
    setTargetType('all'); setUsernames([]); setUsernameInput('')
    setSendMode('now'); setDate(''); setHour('')
  }

  function changeChannel(next: Channel) {
    setChannel(next)
    // Chip yang sudah dipilih dicari berdasarkan identitas channel sebelumnya
    // (username app, username Telegram, atau alamat email) — reset supaya
    // tidak ada chip dengan label yang jadi tidak relevan.
    setUsernames([])
  }

  const canSubmit = batchName.trim() !== '' && body.trim() !== ''
    && (channel === 'telegram' || title.trim() !== '')
    && (targetType === 'all' || usernames.length > 0)
    && (sendMode === 'now' || (date !== '' && hour !== ''))

  const targetUnitLabel = isEmail ? 'email' : 'username'
  const targetCountLabel = targetType === 'all' ? `~${estimate?.targeted ?? 0} user` : `${usernames.length} ${targetUnitLabel}`
  const actionVerb = sendMode === 'schedule' ? 'Jadwalkan Pengiriman' : 'Kirim Sekarang'
  const selectedSender = SENDER_OPTIONS.find(s => s.value === fromAddress)!

  const scheduledAtIso = useMemo(() => {
    if (sendMode === 'now' || !date || !hour) return null
    const iso = new Date(`${date}T${hour}:00:00+07:00`)
    return isNaN(iso.getTime()) ? null : iso.toISOString()
  }, [sendMode, date, hour])

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/blast?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          batchName: batchName.trim(),
          title: channel === 'telegram' ? undefined : title.trim(),
          body: body.trim(),
          fromAddress: isEmail ? fromAddress : undefined,
          targetType,
          targetUsernames: targetType === 'specific' ? usernames.map(u => u.value) : undefined,
          scheduledAt: scheduledAtIso,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(sendMode === 'now' ? 'Blast sedang dikirim' : 'Blast dijadwalkan')
        setShowConfirm(false)
        router.push('/admin/blast')
        return
      }
      toast.error(d.error)
    } catch {
      toast.error('Gagal mengirim permintaan. Periksa koneksi lalu coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Blast Notifikasi</h1>
        <p className="text-sm text-[#6B7280] mt-1">Kirim notifikasi push, Telegram, atau email ke seluruh atau sebagian user Gizku, langsung atau terjadwal.</p>
        <div className="inline-flex gap-0.5 bg-[#F3F4F6] p-0.5 rounded-xl mt-5">
          <span className="text-sm font-semibold px-4 py-2 rounded-lg bg-white text-[#111827] shadow-[0_1px_4px_rgba(16,24,40,0.06)]">
            Kirim Baru
          </span>
          <Link href="/admin/blast" className="text-sm font-semibold px-4 py-2 rounded-lg transition text-[#6B7280] hover:text-[#111827]">
            Riwayat Batch
          </Link>
        </div>
      </div>

      <div className="flex gap-6 items-start flex-wrap">
        <div className="flex-1 min-w-[320px] flex flex-col gap-5" style={{ flexBasis: '560px' }}>

          {/* Channel */}
          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] p-6">
            <h2 className="text-[15px] font-semibold text-[#111827] mb-1">Channel Notifikasi</h2>
            <p className="text-xs text-[#6B7280] mb-4">Pilih saluran pengiriman blast ini.</p>
            <div className="flex gap-2 flex-wrap">
              <Chip label="Push Notifikasi" selected={channel === 'push'} onClick={() => changeChannel('push')} />
              <Chip label="Telegram (Bot Gizku)" selected={channel === 'telegram'} onClick={() => changeChannel('telegram')} />
              <Chip label="Email" selected={channel === 'email'} onClick={() => changeChannel('email')} />
            </div>
          </div>

          {/* Pengirim (email saja) */}
          {isEmail && (
            <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] p-6">
              <h2 className="text-[15px] font-semibold text-[#111827] mb-1">Alamat Pengirim</h2>
              <p className="text-xs text-[#6B7280] mb-4">Pilih identitas pengirim sesuai tujuan campaign.</p>
              <div className="flex flex-col gap-2.5">
                {SENDER_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFromAddress(s.value)}
                    className={`text-left rounded-xl border px-4 py-3 transition ${
                      fromAddress === s.value ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#111827]">{s.label} <span className="font-normal text-[#9CA3AF]">&lt;{s.address}&gt;</span></span>
                      {fromAddress === s.value && <span className="text-[#1F9D57] text-xs font-semibold">Dipilih</span>}
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1">{s.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Konten */}
          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] p-6">
            <h2 className="text-[15px] font-semibold text-[#111827] mb-1">Konten {isEmail ? 'Email' : 'Notifikasi'}</h2>
            <p className="text-xs text-[#6B7280] mb-4">
              {channel === 'push' && 'Nama batch untuk keperluan internal, serta judul dan isi pesan yang tampil di perangkat user.'}
              {channel === 'telegram' && 'Nama batch untuk keperluan internal, serta isi chat yang dikirim lewat Bot Gizku di Telegram.'}
              {isEmail && 'Nama campaign untuk keperluan internal, serta subjek dan isi email yang dikirim ke penerima.'}
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
                {isEmail ? 'Judul Campaign (internal)' : 'Nama Batch (internal)'}
              </label>
              <input
                value={batchName} onChange={e => setBatchName(e.target.value.slice(0, 80))}
                placeholder="Contoh: Promo Akhir Bulan - Broadcast Nasional"
                className="w-full border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
              />
              <p className="text-xs text-[#9CA3AF] mt-1.5">Untuk memudahkan pencarian di riwayat batch. Tidak ditampilkan ke user.</p>
            </div>

            <div className="h-px bg-[#E5E7EB] mb-4" />

            {channel !== 'telegram' && (
              <div className="mb-4">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                    {isEmail ? 'Subjek Email' : 'Judul Notifikasi'}
                  </label>
                  <span className="text-xs text-[#9CA3AF]">{title.length}/{isEmail ? 150 : 65}</span>
                </div>
                <input
                  value={title} onChange={e => setTitle(e.target.value.slice(0, isEmail ? 150 : 65))}
                  placeholder={isEmail ? 'Contoh: Fitur Baru dari Gizku 🎉' : 'Contoh: Fitur Baru: Analisa Otomatis'}
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  {channel === 'push' ? 'Isi Pesan' : channel === 'telegram' ? 'Isi Chat Telegram' : 'Isi Email'}
                </label>
                <span className="text-xs text-[#9CA3AF]">{body.length}/{bodyMax}</span>
              </div>
              <textarea
                value={body} onChange={e => setBody(e.target.value.slice(0, bodyMax))} rows={isEmail ? 10 : 4}
                placeholder={
                  channel === 'push' ? 'Tuliskan isi notifikasi di sini...'
                  : channel === 'telegram' ? 'Tuliskan isi pesan chat Telegram di sini...'
                  : 'Tuliskan isi email di sini. Setiap baris baru akan menjadi paragraf terpisah.'
                }
                className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-3 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition resize-y"
              />
            </div>
          </div>

          {/* Target */}
          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] p-6">
            <h2 className="text-[15px] font-semibold text-[#111827] mb-1">Target Penerima</h2>
            <p className="text-xs text-[#6B7280] mb-4">Pilih siapa yang akan menerima {isEmail ? 'email' : 'notifikasi'} ini.</p>
            <div className="flex gap-2 mb-4">
              <Chip label="Semua User" selected={targetType === 'all'} onClick={() => setTargetType('all')} />
              <Chip label={isEmail ? 'Email Tertentu' : 'Username Tertentu'} selected={targetType === 'specific'} onClick={() => setTargetType('specific')} />
            </div>

            {targetType === 'all' ? (
              <div className="flex items-center gap-2.5 bg-[#F9FAFB] rounded-xl px-3.5 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></svg>
                <span className="text-sm text-[#6B7280]">
                  Akan dikirim ke seluruh <strong className="text-[#111827]">{estimate ? `${estimate.targeted} ${channel === 'telegram' ? 'user Bot Telegram' : isEmail ? 'user dengan email terdaftar' : 'user terdaftar'}` : '…'}</strong>{channel === 'telegram' ? ', terhubung akun Gizku atau belum' : ''}.
                </span>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <div className="flex items-center gap-2 h-11 rounded-xl px-3 bg-white ring-1 ring-[#E5E7EB]">
                    <span className="text-[#9CA3AF] text-sm">{isEmail ? '✉' : '@'}</span>
                    <input
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addByRawInput(usernameInput) } }}
                      disabled={usernames.length >= maxTargets || resolving}
                      placeholder={
                        isEmail ? 'ketik alamat email lalu tekan Enter'
                        : channel === 'telegram' ? 'ketik username Telegram lalu Enter'
                        : 'ketik username lalu tekan Enter'
                      }
                      className="flex-1 border-none outline-none text-sm text-[#111827] bg-transparent disabled:bg-transparent"
                    />
                    <span className={`text-xs font-semibold whitespace-nowrap ${usernames.length >= maxTargets ? 'text-red-500' : 'text-[#9CA3AF]'}`}>
                      {usernames.length}/{maxTargets}
                    </span>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
                      {suggestions.map(s => (
                        <button
                          key={s.value} onClick={() => addFromSuggestion(s)}
                          className="w-full text-left px-3 py-2 text-sm text-[#111827] hover:bg-[#F0FDF4] transition"
                        >{s.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                {channel === 'telegram' && (
                  <p className="text-xs text-[#9CA3AF] mt-1.5">Dicari berdasarkan username Telegram — baik yang sudah maupun belum menghubungkan akun Gizku.</p>
                )}
                {isEmail && (
                  <p className="text-xs text-[#9CA3AF] mt-1.5">Alamat email langsung, tidak harus terhubung ke akun Gizku manapun.</p>
                )}
                {usernames.length >= maxTargets && (
                  <p className="text-xs text-amber-600 mt-1.5">Maksimum {maxTargets} {targetUnitLabel} per batch tercapai.</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {usernames.map(u => (
                    <span key={u.value} className="inline-flex items-center gap-1.5 bg-[#D4F5E4] text-[#1F9D57] text-xs font-semibold pl-3 pr-1.5 py-1.5 rounded-full">
                      {u.label}
                      <button onClick={() => removeUsername(u.value)} aria-label={`Hapus ${u.label}`} className="w-[18px] h-[18px] rounded-full bg-[#1F9D5726] flex items-center justify-center text-[11px] hover:bg-[#1F9D5740]">✕</button>
                    </span>
                  ))}
                </div>
                {usernames.length === 0 && (
                  <p className="text-xs text-[#9CA3AF] italic mt-3">Belum ada {targetUnitLabel} ditambahkan.</p>
                )}
              </div>
            )}
          </div>

          {/* Waktu */}
          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] p-6">
            <h2 className="text-[15px] font-semibold text-[#111827] mb-1">Waktu Pengiriman</h2>
            <p className="text-xs text-[#6B7280] mb-4">Kirim langsung atau jadwalkan untuk waktu tertentu.</p>
            <div className="flex gap-2 mb-4">
              <Chip label="Kirim Sekarang" selected={sendMode === 'now'} onClick={() => setSendMode('now')} />
              <Chip label="Jadwalkan" selected={sendMode === 'schedule'} onClick={() => setSendMode('schedule')} />
            </div>
            {sendMode === 'schedule' && (
              <div>
                <div className="flex gap-2.5 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">Tanggal</label>
                    <input
                      type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                      className="w-full border border-[#E5E7EB] rounded-xl px-3 h-[42px] text-sm bg-[#F9FAFB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] transition"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">Jam</label>
                    <select
                      value={hour} onChange={e => setHour(e.target.value)}
                      className="w-full border border-[#E5E7EB] rounded-xl px-3 h-[42px] text-sm bg-[#F9FAFB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] transition"
                      style={{ colorScheme: 'light' }}
                    >
                      <option value="">Pilih jam</option>
                      {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2.5">Penjadwalan cuma sampai satuan jam (menit selalu :00). Waktu mengikuti zona waktu server admin (WIB).</p>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 justify-end">
            <button onClick={resetForm} className="h-[52px] px-6 rounded-xl border border-[#E5E7EB] text-[#6B7280] text-sm font-medium hover:bg-[#F3F4F6] transition">Reset</button>
            <button
              onClick={() => canSubmit && setShowConfirm(true)}
              disabled={!canSubmit}
              className="h-[52px] px-6 rounded-xl bg-[#2ECC71] text-white text-sm font-semibold hover:bg-[#28B765] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionVerb} → {targetCountLabel}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-none w-[300px] sticky top-6">
          {channel === 'push' && (
            <div className="w-full h-[560px] rounded-[36px] overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(160deg,#3a4a5c,#151d27)' }}>
              <div className="h-full flex flex-col items-center pt-9 px-4">
                <div className="text-white text-[38px] font-semibold tracking-tight">14:32</div>
                <div className="text-white/70 text-xs mt-0.5 mb-6">Selasa, 21 Juli</div>
                <div className="w-full rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-[18px] h-[18px] rounded-[5px] bg-[#2ECC71] flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-white/85 flex-1">GIZKU</span>
                    <span className="text-[10px] text-white/55">sekarang</span>
                  </div>
                  <div className="text-[13px] font-bold text-white mb-0.5">{title || 'Judul notifikasi'}</div>
                  <div className="text-xs text-white/75 leading-relaxed line-clamp-2">{body || 'Isi pesan notifikasi akan tampil di sini seperti yang dilihat user.'}</div>
                </div>
              </div>
            </div>
          )}
          {channel === 'telegram' && (
            <div className="w-full h-[560px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col" style={{ background: '#0e1621' }}>
              <div className="flex items-center gap-2.5 pt-11 pb-3 px-3.5" style={{ background: '#17212b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full bg-[#2ECC71] flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">Gizku Bot</div>
                  <div className="text-[11px] text-white/50">bot</div>
                </div>
              </div>
              <div className="flex-1 p-3 flex flex-col justify-end">
                <div className="max-w-[85%] rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-[4px] px-3 py-2.5" style={{ background: '#182533', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  <div className="text-[13.5px] text-[#e9edf1] leading-relaxed whitespace-pre-wrap">{body || 'Isi pesan chat Telegram akan tampil di sini seperti yang dilihat user.'}</div>
                  <div className="text-[10px] text-white/40 text-right mt-1">14:32</div>
                </div>
              </div>
            </div>
          )}
          {isEmail && (
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-white ring-1 ring-[#E5E7EB]">
              <div className="px-4 py-3 border-b border-[#F3F4F6]">
                <div className="text-[11px] text-[#9CA3AF]">Dari</div>
                <div className="text-sm font-semibold text-[#111827]">{selectedSender.label} &lt;{selectedSender.address}&gt;</div>
              </div>
              <div className="px-4 py-3 border-b border-[#F3F4F6]">
                <div className="text-[11px] text-[#9CA3AF]">Subjek</div>
                <div className="text-sm font-semibold text-[#111827] truncate">{title || 'Subjek email'}</div>
              </div>
              <div className="px-4 py-4 h-[340px] overflow-y-auto">
                <div className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {body || 'Isi email akan tampil di sini seperti yang dilihat penerima.'}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3.5 bg-white ring-1 ring-[#E5E7EB] rounded-xl p-4 text-xs text-[#6B7280] leading-relaxed">
            <strong className="text-[#111827]">Estimasi penerima:</strong>{' '}
            {estimate
              ? (targetType === 'all' ? `${estimate.targeted} user terdaftar` : `${usernames.length} ${targetUnitLabel} dipilih`)
              : `Belum ada ${targetUnitLabel} dipilih`}
            {estimate && targetType === 'all' && (
              <span className="block mt-0.5 text-[#9CA3AF]">{estimate.reachable} di antaranya bisa dijangkau via channel ini.</span>
            )}
            <br />
            {channel === 'push' && <>Dikirim via <strong className="text-[#111827]">FCM</strong> (Android) &amp; <strong className="text-[#111827]">APNs</strong> (iOS).</>}
            {channel === 'telegram' && <>Dikirim via <strong className="text-[#111827]">Bot Gizku</strong> di Telegram.</>}
            {isEmail && <>Dikirim via <strong className="text-[#111827]">Resend</strong>, dari <strong className="text-[#111827]">{selectedSender.address}</strong>.</>}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-[380px] bg-white rounded-2xl p-7">
            <div className="w-11 h-11 rounded-xl bg-[#D4F5E4] flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F9D57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </div>
            <h2 className="text-base font-bold text-[#111827] mb-2">
              {sendMode === 'schedule' ? 'Jadwalkan Blast?' : 'Kirim Blast Sekarang?'}
            </h2>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-5">
              {sendMode === 'schedule'
                ? `Blast akan dijadwalkan pada ${date && hour ? `${date} ${hour}:00 WIB` : '—'} untuk ${targetCountLabel}. Pastikan isi pesan sudah benar.`
                : `Blast akan segera dikirim ke ${targetCountLabel}. Pastikan isi pesan sudah benar.`}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="h-[52px] rounded-xl bg-[#2ECC71] text-white text-base font-semibold hover:bg-[#28B765] transition disabled:opacity-50"
              >
                {submitting ? 'Memproses…' : (sendMode === 'schedule' ? 'Ya, Jadwalkan' : 'Ya, Kirim Sekarang')}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="h-[52px] rounded-xl border border-[#E5E7EB] text-[#6B7280] text-base font-medium hover:bg-[#F3F4F6] transition"
              >Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
