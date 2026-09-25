'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AtSign, Bell, Check, ChevronDown, ImagePlus, Mail, RotateCcw, Send, Users, X, type LucideIcon,
} from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Button, Card, FormField, Input, Modal, Progress, SectionNumber, SegmentedControl, Select, Textarea,
} from '@/components/admin/ui'
import { cn } from '@/lib/utils'

const MAX_TARGETS = 10
const MAX_EMAIL_TARGETS = 100
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_BODY_MAX = 5000
const IMAGE_LINE_RE = /^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_MB = 5

/** Baris `![](url)` yang disisipkan tombol "Sisipkan Gambar" dirender sebagai <img>, mengikuti lib/emailTemplates/blast.ts. */
function EmailBodyPreview({ text }: { text: string }) {
  if (!text) return <>Isi email akan tampil di sini seperti yang dilihat penerima.</>
  return (
    <>
      {text.split('\n').map((line, i) => {
        const match = line.match(IMAGE_LINE_RE)
        if (match) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={match[1]} alt="" className="max-w-full rounded-sm my-2" />
        }
        return <p key={i} className="whitespace-pre-wrap m-0">{line || ' '}</p>
      })}
    </>
  )
}

type Estimate = { targeted: number; reachable: number; platforms: { ios: number; android: number } }
type Channel = 'push' | 'telegram' | 'email'
type FromAddress = 'support' | 'marketing'

const SENDER_OPTIONS: { value: FromAddress; label: string; address: string; hint: string }[] = [
  { value: 'support', label: 'Gizku Support', address: 'support@gizku.com', hint: 'Reachout informasi penting ke user (mis. pengumuman, insiden, verifikasi).' },
  { value: 'marketing', label: 'Gizku Marketing', address: 'marketing@gizku.com', hint: 'Keperluan promosional (mis. fitur baru, promo, campaign).' },
]
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
  const [uploadingImage, setUploadingImage] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  function insertAtCursor(text: string) {
    const el = bodyRef.current
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    const next = (body.slice(0, start) + text + body.slice(end)).slice(0, bodyMax)
    setBody(next)
    requestAnimationFrame(() => {
      if (!el) return
      const pos = Math.min(start + text.length, bodyMax)
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  async function handleImageFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(`Format tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, atau GIF.`)
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Ukuran gambar terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal ${MAX_IMAGE_MB} MB.`)
      return
    }
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/blast/upload-image', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Upload gambar gagal'); return }
      insertAtCursor(`\n![](${d.url})\n`)
    } catch {
      toast.error('Gagal upload gambar, coba lagi')
    } finally {
      setUploadingImage(false)
    }
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

  const CHANNELS: { value: Channel; label: string; icon: LucideIcon }[] = [
    { value: 'push', label: 'Push Notifikasi', icon: Bell },
    { value: 'telegram', label: 'Telegram (Bot Gizku)', icon: Send },
    { value: 'email', label: 'Email', icon: Mail },
  ]
  const [previewOpen, setPreviewOpen] = useState(false)

  const section = (n: number, title: string, desc: string, children: React.ReactNode, first = false) => (
    <section className={cn('flex gap-3.5', !first && 'lg:border-t lg:border-border lg:pt-5')} aria-labelledby={`sec-${n}`}>
      <SectionNumber n={n} />
      <div className="flex-1 min-w-0">
        <h2 id={`sec-${n}`} className="text-md font-semibold text-primary leading-7">{title}</h2>
        <p className="text-sm text-secondary mb-3.5">{desc}</p>
        {children}
      </div>
    </section>
  )

  const channelSection = (
    <>
      {/* Desktop: segmented; mobile: stacked big buttons */}
      <SegmentedControl ariaLabel="Channel notifikasi" options={CHANNELS} value={channel} onChange={changeChannel} mobileGrid={false} className="max-lg:hidden" />
      <div role="group" aria-label="Channel notifikasi" className="lg:hidden flex flex-col gap-2">
        {CHANNELS.map(c => {
          const active = channel === c.value
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={active}
              onClick={() => changeChannel(c.value)}
              className={cn(
                'flex items-center gap-3 min-h-12 px-3.5 rounded-sm border text-[15px] font-medium text-left transition-colors',
                active ? 'border-2 border-brand bg-green-50 text-green-800' : 'border-border-strong bg-surface text-bark-800',
              )}
            >
              <c.icon size={18} aria-hidden className={active ? 'text-brand' : 'text-secondary'} />
              <span className="flex-1">{c.label}</span>
              {active && <Check size={18} aria-hidden className="text-brand" />}
            </button>
          )
        })}
      </div>

      {isEmail && (
        <fieldset className="mt-4">
          <legend className="text-base font-semibold text-primary mb-2">Alamat Pengirim</legend>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {SENDER_OPTIONS.map(s => {
              const active = fromAddress === s.value
              return (
                <label
                  key={s.value}
                  className={cn(
                    'relative flex gap-2.5 rounded-sm px-3.5 py-3 cursor-pointer transition-colors',
                    active ? 'border-2 border-brand bg-green-50' : 'border border-border-strong hover:bg-muted',
                  )}
                >
                  <input type="radio" name="sender" value={s.value} checked={active} onChange={() => setFromAddress(s.value)} className="mt-1 accent-[var(--green-600)]" />
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-primary">{s.label}</span>
                    <span className="block text-sm text-secondary">{s.address}</span>
                    <span className="block text-sm text-bark-700 mt-1 leading-normal">{s.hint}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}
    </>
  )

  const contentSection = (
    <div className="flex flex-col gap-4">
      <FormField label={isEmail ? 'Judul Campaign (internal)' : 'Nama Batch (internal)'} htmlFor="blast-batch" help="Untuk memudahkan pencarian di riwayat batch. Tidak ditampilkan ke user.">
        <Input id="blast-batch" value={batchName} onChange={e => setBatchName(e.target.value.slice(0, 80))} placeholder="Contoh: Promo Akhir Bulan - Broadcast Nasional" />
      </FormField>
      {channel !== 'telegram' && (
        <FormField
          label={isEmail ? 'Subjek Email' : 'Judul Notifikasi'}
          htmlFor="blast-title"
          labelAside={<span className="text-sm text-secondary tabular-nums">{title.length}/{isEmail ? 150 : 65}</span>}
        >
          <Input
            id="blast-title"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, isEmail ? 150 : 65))}
            placeholder={isEmail ? 'Contoh: Fitur Baru dari Gizku' : 'Contoh: Fitur Baru: Analisa Otomatis'}
          />
        </FormField>
      )}
      <FormField label={channel === 'push' ? 'Isi Pesan' : channel === 'telegram' ? 'Isi Chat Telegram' : 'Isi Email'} htmlFor="blast-body">
        <Textarea
          id="blast-body"
          ref={bodyRef}
          value={body}
          onChange={e => setBody(e.target.value.slice(0, bodyMax))}
          rows={isEmail ? 10 : 4}
          placeholder={
            channel === 'push' ? 'Tuliskan isi notifikasi di sini...'
            : channel === 'telegram' ? 'Tuliskan isi pesan chat Telegram di sini...'
            : 'Tuliskan isi email di sini. Setiap baris baru akan menjadi paragraf terpisah. Gunakan tombol "Sisipkan Gambar" untuk menambahkan gambar.'
          }
        />
      </FormField>
      <div className="flex items-center gap-3 flex-wrap -mt-2">
        {isEmail && (
          <>
            <Button variant="outline" size="sm" icon={ImagePlus} loading={uploadingImage} disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
              {uploadingImage ? 'Mengupload…' : 'Sisipkan Gambar'}
            </Button>
            <span className="text-sm text-secondary">JPEG/PNG/WebP/GIF, maks {MAX_IMAGE_MB}MB</span>
            <input
              ref={imageInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }}
            />
          </>
        )}
        <span className="ml-auto text-sm text-secondary tabular-nums">{body.length} / {bodyMax}</span>
      </div>
    </div>
  )

  const targetSection = (
    <>
      <SegmentedControl
        ariaLabel="Target penerima"
        options={[{ value: 'all', label: 'Semua User' }, { value: 'specific', label: isEmail ? 'Email Tertentu' : 'User Tertentu' }]}
        value={targetType}
        onChange={v => setTargetType(v as 'all' | 'specific')}
      />
      {targetType === 'all' ? (
        <div className="flex items-center gap-2.5 bg-sunken border border-border rounded-sm px-3.5 py-3 mt-3.5">
          <Users size={16} className="text-secondary shrink-0" aria-hidden />
          <span className="text-base text-bark-700">
            Akan dikirim ke seluruh <strong className="text-primary">{estimate ? `${estimate.targeted} ${channel === 'telegram' ? 'user Bot Telegram' : isEmail ? 'user dengan email terdaftar' : 'user terdaftar'}` : '…'}</strong>{channel === 'telegram' ? ', terhubung akun Gizku atau belum' : ''}.
          </span>
        </div>
      ) : (
        <div className="mt-3.5">
          <label htmlFor="blast-target" className="sr-only">{isEmail ? 'Alamat email penerima' : 'Username penerima'}</label>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] max-lg:min-h-11 rounded-sm border border-border-strong bg-surface px-2 py-1 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              {isEmail ? <Mail size={15} className="text-secondary ml-1" aria-hidden /> : <AtSign size={15} className="text-secondary ml-1" aria-hidden />}
              {usernames.map(u => (
                <span key={u.value} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 text-sm font-medium pl-2.5 pr-1 py-0.5 rounded-pill">
                  {u.label}
                  <button type="button" onClick={() => removeUsername(u.value)} aria-label={`Hapus ${u.label}`} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
                    <X size={12} aria-hidden />
                  </button>
                </span>
              ))}
              <input
                id="blast-target"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addByRawInput(usernameInput) } }}
                disabled={usernames.length >= maxTargets || resolving}
                placeholder={
                  isEmail ? 'ketik alamat email lalu tekan Enter'
                  : channel === 'telegram' ? 'ketik username Telegram lalu Enter'
                  : 'ketik username lalu tekan Enter'
                }
                aria-describedby="blast-target-help"
                autoComplete="off"
                className="flex-1 min-w-[160px] border-none outline-none text-base max-lg:text-md text-primary bg-transparent py-1 placeholder:text-tertiary"
              />
            </div>
            {suggestions.length > 0 && (
              <ul role="listbox" aria-label="Saran username" className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-sm shadow-md overflow-hidden list-none m-0 p-0">
                {suggestions.map(s => (
                  <li key={s.value}>
                    <button type="button" onClick={() => addFromSuggestion(s)} className="w-full text-left px-3 min-h-10 text-base text-primary hover:bg-green-50 focus-visible:bg-green-50 focus-visible:outline-none">
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p id="blast-target-help" className={cn('text-sm mt-1.5', usernames.length >= maxTargets ? 'text-bark-800 font-medium' : 'text-secondary')}>
            {usernames.length} / {maxTargets} {targetUnitLabel}
            {usernames.length >= maxTargets ? ` — maksimum per batch tercapai.` : ` · tekan Enter untuk menambahkan.`}
            {channel === 'telegram' && ' Dicari berdasarkan username Telegram — baik yang sudah maupun belum menghubungkan akun Gizku.'}
            {isEmail && ' Alamat email langsung, tidak harus terhubung ke akun Gizku manapun.'}
          </p>
        </div>
      )}
    </>
  )

  const timeSection = (
    <>
      <SegmentedControl
        ariaLabel="Waktu pengiriman"
        options={[{ value: 'now', label: 'Kirim Sekarang' }, { value: 'schedule', label: 'Jadwalkan' }]}
        value={sendMode}
        onChange={v => setSendMode(v as 'now' | 'schedule')}
      />
      {sendMode === 'schedule' && (
        <div className="mt-3.5">
          <div className="grid grid-cols-2 gap-3 lg:max-w-[420px]">
            <FormField label="Tanggal" htmlFor="blast-date">
              <Input id="blast-date" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} style={{ colorScheme: 'light' }} />
            </FormField>
            <FormField label="Jam" htmlFor="blast-hour">
              <Select id="blast-hour" value={hour} onChange={e => setHour(e.target.value)}>
                <option value="">Pilih jam</option>
                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}:00</option>)}
              </Select>
            </FormField>
          </div>
          <p className="text-sm text-secondary mt-2">Penjadwalan cuma sampai satuan jam (menit selalu :00). Waktu mengikuti zona waktu server admin (WIB).</p>
        </div>
      )}
    </>
  )

  const preview = (
    <>
      {channel === 'push' && (
        <div className="w-full max-w-[300px] mx-auto h-[480px] rounded-[32px] overflow-hidden shadow-md bg-gradient-to-b from-green-800 to-bark-800">
          <div className="h-full flex flex-col items-center pt-9 px-4">
            <div className="text-white text-[38px] font-semibold tracking-tight">14:32</div>
            <div className="text-white/75 text-xs mt-0.5 mb-6">Selasa, 21 Juli</div>
            <div className="w-full rounded-lg p-3.5 bg-white/15 backdrop-blur-md shadow-md">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-[18px] h-[18px] rounded-xs bg-brand flex-shrink-0" />
                <span className="text-[11px] font-semibold text-white/85 flex-1">GIZKU</span>
                <span className="text-[11px] text-white/65">sekarang</span>
              </div>
              <div className="text-[13px] font-bold text-white mb-0.5 break-words">{title || 'Judul notifikasi'}</div>
              <div className="text-xs text-white/80 leading-relaxed line-clamp-2 break-words">{body || 'Isi pesan notifikasi akan tampil di sini seperti yang dilihat user.'}</div>
            </div>
          </div>
        </div>
      )}
      {channel === 'telegram' && (
        <div className="w-full max-w-[300px] mx-auto h-[480px] rounded-[32px] overflow-hidden shadow-md flex flex-col bg-bark-900">
          <div className="flex items-center gap-2.5 pt-10 pb-3 px-3.5 bg-bark-800 border-b border-white/10">
            <div className="w-8 h-8 rounded-full bg-tg flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">Gizku Bot</div>
              <div className="text-[11px] text-white/60">bot</div>
            </div>
          </div>
          <div className="flex-1 p-3 flex flex-col justify-end">
            <div className="max-w-[85%] rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-xs px-3 py-2.5 bg-bark-700 shadow-sm">
              <div className="text-[13.5px] text-white leading-relaxed whitespace-pre-wrap break-words">{body || 'Isi pesan chat Telegram akan tampil di sini seperti yang dilihat user.'}</div>
              <div className="text-[11px] text-white/55 text-right mt-1">14:32</div>
            </div>
          </div>
        </div>
      )}
      {isEmail && (
        <div className="w-full rounded-md overflow-hidden border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-xs text-secondary">Dari</div>
            <div className="text-base font-semibold text-primary break-words">{selectedSender.label} &lt;{selectedSender.address}&gt;</div>
          </div>
          <div className="px-4 py-3 border-b border-border">
            <div className="text-xs text-secondary">Subjek</div>
            <div className="text-base font-semibold text-primary truncate">{title || 'Subjek email'}</div>
          </div>
          <div className="px-4 py-4 h-[320px] overflow-y-auto text-[13px] text-bark-700 leading-relaxed">
            <EmailBodyPreview text={body} />
          </div>
        </div>
      )}
    </>
  )

  const pct = (n: number) => estimate && estimate.targeted > 0 ? (n / estimate.targeted) * 100 : 0
  const estimateCard = (
    <Card title="Estimasi Penerima" icon={Users}>
      <p className="text-[32px] font-bold text-primary tabular-nums leading-none">
        {targetType === 'all' ? `~${estimate?.targeted ?? 0}` : usernames.length}
      </p>
      <p className="text-sm text-secondary mt-1">
        {targetType === 'all' ? (estimate ? 'user terdaftar' : 'menghitung…') : `${targetUnitLabel} dipilih`}
      </p>
      {estimate && (
        <div className="flex flex-col gap-3 mt-4">
          {[
            { label: 'Dapat dijangkau', value: estimate.reachable, tone: 'brand' as const },
            ...(channel === 'push' ? [
              { label: 'Android', value: estimate.platforms.android, tone: 'green' as const },
              { label: 'iOS', value: estimate.platforms.ios, tone: 'sand' as const },
            ] : []),
          ].map(r => (
            <div key={r.label}>
              <div className="flex justify-between text-sm mb-1"><span className="text-bark-700">{r.label}</span><span className="font-semibold tabular-nums">{r.value}</span></div>
              <Progress value={pct(r.value)} tone={r.tone} label={r.label} />
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-secondary mt-4 leading-normal">
        {channel === 'push' && <>Dikirim via <strong className="text-primary">FCM</strong> (Android) &amp; <strong className="text-primary">APNs</strong> (iOS).</>}
        {channel === 'telegram' && <>Dikirim via <strong className="text-primary">Bot Gizku</strong> di Telegram.</>}
        {isEmail && <>Dikirim via <strong className="text-primary">Resend</strong>, dari <strong className="text-primary">{selectedSender.address}</strong>.</>}
      </p>
    </Card>
  )

  const actions = (
    <div className="flex items-center gap-2 max-lg:flex-col-reverse max-lg:items-stretch">
      <Button variant="outline" icon={RotateCcw} onClick={resetForm} className="max-lg:hidden">Reset</Button>
      <div className="flex-1 max-lg:hidden" />
      <div className="lg:hidden grid grid-cols-2 gap-2">
        <Button variant="outline" icon={RotateCcw} onClick={resetForm}>Reset</Button>
        <Button variant="outline" href="/admin/blast">Batal</Button>
      </div>
      <Button variant="outline" href="/admin/blast" className="max-lg:hidden">Batal</Button>
      <Button icon={Send} onClick={() => canSubmit && setShowConfirm(true)} disabled={!canSubmit}>
        {actionVerb} · {targetCountLabel}
      </Button>
    </div>
  )

  return (
    <AdminPage title="Buat Blast Baru" breadcrumb={[{ label: 'Blast Notifikasi', href: '/admin/blast' }, { label: 'Kirim Baru' }]}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        {/* Desktop form card */}
        <Card outline="brand" icon={Send} title="Buat Blast Baru" className="xl:col-span-8 max-lg:hidden" footer={actions} bodyClassName="flex flex-col gap-5">
          {section(1, 'Channel Notifikasi', 'Pilih saluran pengiriman blast ini.', channelSection, true)}
          {section(2, isEmail ? 'Konten Email' : 'Konten Notifikasi',
            channel === 'push' ? 'Nama batch untuk keperluan internal, serta judul dan isi pesan yang tampil di perangkat user.'
            : channel === 'telegram' ? 'Nama batch untuk keperluan internal, serta isi chat yang dikirim lewat Bot Gizku di Telegram.'
            : 'Nama campaign untuk keperluan internal, serta subjek dan isi email yang dikirim ke penerima.',
            contentSection)}
          {section(3, 'Target Penerima', `Pilih siapa yang akan menerima ${isEmail ? 'email' : 'notifikasi'} ini.`, targetSection)}
          {section(4, 'Waktu Pengiriman', 'Kirim langsung atau jadwalkan untuk waktu tertentu.', timeSection)}
        </Card>

        {/* Mobile: one card per section */}
        <div className="lg:hidden flex flex-col gap-4">
          <Card>{section(1, 'Channel Notifikasi', 'Pilih saluran pengiriman blast ini.', channelSection, true)}</Card>
          <Card>{section(2, isEmail ? 'Konten Email' : 'Konten Notifikasi', 'Nama batch internal, judul dan isi pesan.', contentSection, true)}</Card>
          <Card>{section(3, 'Target Penerima', `Pilih siapa yang akan menerima ${isEmail ? 'email' : 'notifikasi'} ini.`, targetSection, true)}</Card>
          <Card>{section(4, 'Waktu Pengiriman', 'Kirim langsung atau jadwalkan.', timeSection, true)}</Card>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-5 max-lg:gap-4 xl:sticky xl:top-[72px]">
          <Card title="Pratinjau" className="max-lg:hidden">{preview}</Card>
          <section className="lg:hidden bg-surface rounded-md shadow-card overflow-hidden">
            <button
              type="button"
              aria-expanded={previewOpen}
              aria-controls="blast-preview-m"
              onClick={() => setPreviewOpen(o => !o)}
              className="w-full flex items-center gap-2 px-4 min-h-12 text-left"
            >
              <span className="text-md font-semibold text-primary flex-1">Pratinjau</span>
              <ChevronDown size={18} className={cn('text-secondary transition-transform', previewOpen && 'rotate-180')} aria-hidden />
            </button>
            {previewOpen && <div id="blast-preview-m" className="p-4 border-t border-border">{preview}</div>}
          </section>
          {estimateCard}
        </div>

        <div className="lg:hidden">{actions}</div>
      </div>

      <Modal
        open={showConfirm}
        onClose={() => !submitting && setShowConfirm(false)}
        closeDisabled={submitting}
        title={sendMode === 'schedule' ? 'Jadwalkan Blast?' : 'Kirim Blast Sekarang?'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>Batal</Button>
            <Button icon={Send} loading={submitting} onClick={submit}>
              {submitting ? 'Memproses…' : (sendMode === 'schedule' ? 'Ya, Jadwalkan' : 'Ya, Kirim Sekarang')}
            </Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          {sendMode === 'schedule'
            ? `Blast akan dijadwalkan pada ${date && hour ? `${date} ${hour}:00 WIB` : '—'} untuk ${targetCountLabel}. Pastikan isi pesan sudah benar.`
            : `Blast akan segera dikirim ke ${targetCountLabel}. Pastikan isi pesan sudah benar.`}
        </p>
      </Modal>
    </AdminPage>
  )
}
