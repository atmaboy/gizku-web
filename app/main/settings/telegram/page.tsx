'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import ListItem from '@/components/ui/ListItem'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { IconTelegram, IconCopy, IconCheck } from '@/components/ui/icons'

type TelegramStatus = {
  linked: boolean
  telegramUsername?: string
  telegramFirstName?: string
}

type LinkToken = {
  token: string
  expiresAt: string
  botUsername: string
  deepLink: string | null
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
}

export default function TelegramSettingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [linkToken, setLinkToken] = useState<LinkToken | null>(null)
  const [loadingLink, setLoadingLink] = useState(false)
  const [loadingUnlink, setLoadingUnlink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/user?action=profile', { headers: authHeaders(), cache: 'no-store' })
    if (res.status === 401) { router.replace('/login'); return }
    const data = await res.json()
    setStatus({
      linked: !!data.user?.telegramId,
      telegramUsername: data.user?.telegramUsername,
      telegramFirstName: data.user?.telegramFirstName,
    })
  }, [router])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    if (!linkToken) { setTimeLeft(null); return }
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(linkToken.expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0) setLinkToken(null)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [linkToken])

  async function generateLink() {
    setLoadingLink(true)
    try {
      const res = await fetch('/api/telegram/link', { method: 'POST', headers: authHeaders() })
      if (res.status === 401) { router.replace('/login'); return }
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal membuat kode link.'); return }
      setLinkToken(data)
    } catch { toast.error('Tidak dapat terhubung ke server.') }
    finally { setLoadingLink(false) }
  }

  async function disconnect() {
    setLoadingUnlink(true)
    try {
      const res = await fetch('/api/telegram/link', { method: 'DELETE', headers: authHeaders() })
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Gagal memutus koneksi.'); return }
      setStatus(s => s ? { ...s, linked: false, telegramUsername: undefined, telegramFirstName: undefined } : s)
      setLinkToken(null)
      toast.success('Akun Telegram berhasil diputus.')
    } catch { toast.error('Tidak dapat terhubung ke server.') }
    finally { setLoadingUnlink(false); setConfirmDisconnect(false) }
  }

  async function copyToken() {
    if (!linkToken) return
    try {
      await navigator.clipboard.writeText(`/link ${linkToken.token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function formatTime(sec: number) {
    return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Koneksi Telegram" onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        <Card className="px-5 py-6 mb-4 flex flex-col items-center text-center gap-2.5">
          <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center" style={{ color: 'var(--color-text-brand)' }}>
            <IconTelegram size={26} />
          </div>
          {status ? (
            <>
              <div className="text-lg font-semibold text-primary">
                {status.linked ? 'Telegram Terhubung' : 'Hubungkan Bot Telegram'}
              </div>
              <div className="text-sm text-secondary leading-normal max-w-[260px]">
                {status.linked
                  ? 'Kamu bisa mencatat makanan langsung lewat chat Telegram.'
                  : 'Catat makanan dan dapatkan analisis nutrisi langsung dari chat Telegram.'}
              </div>
            </>
          ) : (
            <>
              <div className="gizku-skeleton h-5 w-40" />
              <div className="gizku-skeleton h-3.5 w-56 mt-1" />
              <div className="gizku-skeleton h-3.5 w-44" />
            </>
          )}
        </Card>

        {!status ? (
          <Card className="p-4 mb-4">
            <div className="gizku-skeleton h-3 w-32 mb-3.5" />
            <div className="gizku-skeleton h-3.5 w-full mb-2.5" />
            <div className="gizku-skeleton h-3.5 w-full mb-2.5" />
            <div className="gizku-skeleton h-3.5 w-3/4" />
          </Card>
        ) : status.linked ? (
          <>
            <Card className="overflow-hidden mb-4">
              <ListItem
                label={status.telegramUsername ? `@${status.telegramUsername}` : (status.telegramFirstName ?? 'Terhubung')}
                overline="Akun Terhubung"
                leadingIcon={<IconTelegram size={16} />}
                showChevron={false}
              />
            </Card>
            <Button variant="danger-outline" onClick={() => setConfirmDisconnect(true)}>Putuskan Koneksi</Button>
          </>
        ) : (
          <>
            <Card className="p-4 mb-4">
              <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-3">Cara Menghubungkan</div>
              {[
                ['1', <>Buka bot <b className="text-primary">@GizkuBot</b> di Telegram</>],
                ['2', <>Ketuk <b className="text-primary">Mulai</b> dan kirim kode akun kamu</>],
                ['3', <>Foto makananmu langsung dari chat Telegram, otomatis tersimpan ke Gizku</>],
              ].map(([num, text], i) => (
                <div key={i} className="flex gap-2.5 mb-3 last:mb-0">
                  <div className="w-5 h-5 rounded-full bg-brand-tint flex items-center justify-center shrink-0 text-2xs font-semibold" style={{ color: 'var(--color-text-brand)' }}>{num}</div>
                  <span className="text-sm text-secondary leading-normal">{text}</span>
                </div>
              ))}
            </Card>

            {!linkToken ? (
              <Button loading={loadingLink} onClick={generateLink}>Hubungkan Sekarang</Button>
            ) : (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-[0.05em]">Kode Verifikasi</span>
                  <span
                    className="text-xs font-bold rounded-pill px-2 py-0.5"
                    style={{
                      color: timeLeft !== null && timeLeft < 60 ? 'var(--color-danger)' : 'var(--color-warning)',
                      background: timeLeft !== null && timeLeft < 60 ? 'rgba(194,91,88,0.08)' : 'rgba(217,155,63,0.12)',
                    }}
                  >
                    {timeLeft !== null ? formatTime(timeLeft) : '—'}
                  </span>
                </div>
                <div className="text-center bg-surface shadow-hairline rounded-md py-2.5 mb-2.5 text-2xl font-extrabold tracking-[0.3em] text-primary">
                  {linkToken.token}
                </div>
                <div className="flex gap-2 mb-2.5">
                  <button
                    onClick={copyToken}
                    className="flex-1 h-10 rounded-md shadow-hairline bg-surface flex items-center justify-center gap-1.5 text-sm font-semibold cursor-pointer"
                    style={{ color: copied ? 'var(--color-success)' : 'var(--color-text-primary)' }}
                  >
                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                    {copied ? 'Tersalin!' : 'Salin Perintah'}
                  </button>
                  {linkToken.deepLink && (
                    <a
                      href={linkToken.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-10 rounded-md flex items-center justify-center gap-1.5 text-sm font-semibold text-white"
                      style={{ background: 'var(--tg-blue)' }}
                    >
                      <IconTelegram size={15} color="#fff" />
                      Buka Bot
                    </a>
                  )}
                </div>
                <p className="text-xs text-secondary text-center leading-normal">
                  Kirim <b className="text-primary">/link {linkToken.token}</b> ke bot Telegram Gizku
                </p>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Putuskan koneksi Telegram?"
        description="Kamu tidak akan bisa mencatat makanan lewat chat Telegram sampai menghubungkan kembali."
        actions={[
          { label: loadingUnlink ? 'Memutus...' : 'Ya, Putuskan', variant: 'danger-outline', onClick: disconnect, loading: loadingUnlink },
          { label: 'Batal', variant: 'outline', onClick: () => setConfirmDisconnect(false) },
        ]}
      />
    </div>
  )
}
