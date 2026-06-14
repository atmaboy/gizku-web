'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  instruction: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null)
  const [linkToken, setLinkToken] = useState<LinkToken | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingLink, setLoadingLink] = useState(false)
  const [loadingUnlink, setLoadingUnlink] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  const C = {
    bg: '#F9FAFB', white: '#FFFFFF', border: '#E5E7EB',
    text: '#111827', muted: '#6B7280', green: '#2ECC71',
    greenDim: '#D4F5E4', greenDeep: '#15803D',
    red: '#EF4444', orange: '#F59E0B', orangeDim: '#FEF3C7',
    tg: '#26A5E4',
  }

  const getToken = useCallback(() => localStorage.getItem('nl_token') ?? '', [])

  const fetchTgStatus = useCallback(async () => {
    setLoadingStatus(true)
    setError('')
    try {
      const res = await fetch('/api/user?action=profile', {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: 'no-store',
      })
      if (res.status === 401) { router.replace('/login'); return }
      const data = await res.json()
      setTgStatus({
        linked: !!data.user?.telegramId,
        telegramUsername: data.user?.telegramUsername,
        telegramFirstName: data.user?.telegramFirstName,
      })
    } catch {
      setError('Tidak dapat memuat status akun. Periksa koneksi internet kamu.')
    } finally {
      setLoadingStatus(false)
    }
  }, [getToken, router])

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    if (!token) { router.replace('/login'); return }
    fetchTgStatus()
  }, [fetchTgStatus, router])

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
    setLoadingLink(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.status === 401) { router.replace('/login'); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal membuat kode link.'); return }
      setLinkToken(data)
    } catch { setError('Tidak dapat terhubung ke server.') }
    finally { setLoadingLink(false) }
  }

  async function unlinkTelegram() {
    setLoadingUnlink(true); setConfirmUnlink(false); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Gagal memutus koneksi.'); return }
      setTgStatus(prev => prev ? { ...prev, linked: false, telegramUsername: undefined, telegramFirstName: undefined } : prev)
      setLinkToken(null)
      setSuccess('Akun Telegram berhasil diputus.')
      setTimeout(() => setSuccess(''), 4000)
    } catch { setError('Tidak dapat terhubung ke server.') }
    finally { setLoadingUnlink(false) }
  }

  async function copyToken() {
    if (!linkToken) return
    try { await navigator.clipboard.writeText(`/link ${linkToken.token}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { }
  }

  function formatTime(sec: number) {
    return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
  }

  function getAvatarLetter() {
    if (tgStatus?.telegramFirstName) return tgStatus.telegramFirstName[0].toUpperCase()
    if (tgStatus?.telegramUsername) return tgStatus.telegramUsername[0].toUpperCase()
    return 'T'
  }

  const IconTelegram = (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.446 13.28l-2.95-.924c-.64-.203-.657-.64.136-.954l11.57-4.461c.537-.194 1.006.131.692.28z"/></svg>)
  const IconArrowLeft = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>)
  const IconLink = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>)
  const IconCheck = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
  const IconCopy = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>)
  const IconUnlink = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
  const IconShield = (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: C.bg, fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* ── Confirm Disconnect Bottom Sheet ── */}
      {confirmUnlink && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.white, borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 480, boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 24px' }} />
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.red }}>
                {IconUnlink}
              </div>
              <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8 }}>
                Putuskan Koneksi Telegram?
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0, maxWidth: 300, marginInline: 'auto' }}>
                {tgStatus?.telegramFirstName || tgStatus?.telegramUsername
                  ? `Akun ${tgStatus.telegramFirstName ?? ''}${tgStatus.telegramUsername ? ` (@${tgStatus.telegramUsername})` : ''} akan dilepas dari Gizku.`
                  : 'Akun Telegram kamu akan dilepas dari Gizku.'}
                {' '}Kamu tidak bisa kirim foto via bot sampai dihubungkan kembali.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={unlinkTelegram} disabled={loadingUnlink} style={{ width: '100%', padding: '14px', borderRadius: 14, background: C.red, border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loadingUnlink ? 'not-allowed' : 'pointer', opacity: loadingUnlink ? 0.7 : 1 }}>
                {loadingUnlink ? 'Memutus koneksi...' : 'Ya, Putuskan'}
              </button>
              <button onClick={() => setConfirmUnlink(false)} style={{ width: '100%', padding: '14px', borderRadius: 14, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, background: C.white, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.text }}>
          {IconArrowLeft}
        </button>
        <div>
          <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 700, fontSize: 17, color: C.text }}>Pengaturan</div>
          <div style={{ fontSize: 12, color: C.muted }}>Kelola koneksi akun Gizku kamu</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 40px' }}>

        {error && (<div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '10px 14px', color: C.red, fontSize: 13, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><span>⚠️</span> {error}</div>)}
        {success && (<div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '10px 14px', color: C.greenDeep, fontSize: 13, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><span>✅</span> {success}</div>)}

        {/* ── Telegram Card ── */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>

          {/* Card header */}
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E8F5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tg, flexShrink: 0 }}>
              {IconTelegram}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 700, fontSize: 15, color: C.text }}>Telegram Bot</div>
              <div style={{ fontSize: 12, color: C.muted }}>Analisis nutrisi langsung dari chat</div>
            </div>
            {/* Status pill */}
            {!loadingStatus && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: tgStatus?.linked ? '#F0FDF4' : C.bg, border: `1px solid ${tgStatus?.linked ? '#BBF7D0' : C.border}`, borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: tgStatus?.linked ? C.green : C.muted, boxShadow: tgStatus?.linked ? `0 0 0 2px ${C.greenDim}` : 'none' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: tgStatus?.linked ? C.greenDeep : C.muted }}>
                  {tgStatus?.linked ? 'Terhubung' : 'Belum terhubung'}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '18px 18px' }}>
            {loadingStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[80, 60, 100].map((w, i) => (<div key={i} style={{ height: 14, width: `${w}%`, borderRadius: 7, background: 'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />))}
              </div>
            ) : tgStatus?.linked ? (

              /* ═══ LINKED STATE ═══ */
              <div>
                {/* Account card */}
                <div style={{ background: 'linear-gradient(135deg,#E8F5FD 0%,#F0FDF4 100%)', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  {/* Avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.tg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, flexShrink: 0, boxShadow: '0 2px 8px rgba(38,165,228,0.35)' }}>
                    {getAvatarLetter()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {tgStatus.telegramFirstName && (
                      <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 700, fontSize: 16, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tgStatus.telegramFirstName}
                      </div>
                    )}
                    {tgStatus.telegramUsername && (
                      <div style={{ fontSize: 13, color: C.tg, fontWeight: 600, marginTop: 2 }}>@{tgStatus.telegramUsername}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      <span style={{ color: C.green, display: 'flex', alignItems: 'center' }}>{IconCheck}</span>
                      <span style={{ fontSize: 11, color: C.greenDeep, fontWeight: 600 }}>Terverifikasi & terhubung</span>
                    </div>
                  </div>
                  <div style={{ color: C.tg, opacity: 0.4, flexShrink: 0 }}>{IconTelegram}</div>
                </div>

                {/* What you can do */}
                <div style={{ background: C.bg, borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                  {[
                    { icon: '📸', text: 'Kirim foto makanan ke bot untuk analisis nutrisi otomatis' },
                    { icon: '📊', text: 'Hasil analisis tersimpan ke riwayat Gizku kamu' },
                    { icon: '🔍', text: 'Lihat detail lengkap di halaman Riwayat' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 8 : 0 }}>
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Disconnect button */}
                <button
                  onClick={() => setConfirmUnlink(true)}
                  disabled={loadingUnlink}
                  style={{ width: '100%', padding: '13px', borderRadius: 13, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)', color: C.red, fontWeight: 600, fontSize: 14, cursor: loadingUnlink ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loadingUnlink ? 0.6 : 1 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{IconUnlink}</span>
                  Putuskan Koneksi Telegram
                </button>

                {/* Security note */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
                  <span style={{ color: C.muted, display: 'flex', alignItems: 'center', marginTop: 1 }}>{IconShield}</span>
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Memutus koneksi tidak menghapus riwayat analisis yang sudah tersimpan.</span>
                </div>
              </div>

            ) : (

              /* ═══ NOT LINKED STATE ═══ */
              <div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>
                  Hubungkan akun Gizku ke Telegram untuk bisa kirim foto makanan dan mendapat analisis nutrisi langsung dari bot.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {[
                    { num: '1', text: 'Klik tombol di bawah untuk generate kode unik' },
                    { num: '2', text: 'Buka bot Gizku di Telegram dan kirim kode tersebut' },
                    { num: '3', text: 'Akun kamu akan terhubung otomatis ✓' },
                  ].map(step => (
                    <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#E8F5FD', color: C.tg, fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{step.num}</div>
                      <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{step.text}</span>
                    </div>
                  ))}
                </div>
                {!linkToken ? (
                  <button onClick={generateLink} disabled={loadingLink} style={{ width: '100%', padding: '13px', borderRadius: 13, background: C.tg, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: loadingLink ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loadingLink ? 0.75 : 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>{IconLink}</span>
                    {loadingLink ? 'Membuat kode...' : 'Generate Kode Link'}
                  </button>
                ) : (
                  <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '14px 14px 12px', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kode Verifikasi</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: timeLeft !== null && timeLeft < 60 ? C.red : C.orange, background: timeLeft !== null && timeLeft < 60 ? 'rgba(239,68,68,.08)' : C.orangeDim, padding: '2px 8px', borderRadius: 999 }}>
                        {timeLeft !== null ? `⏱ ${formatTime(timeLeft)}` : '—'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-montserrat), monospace', fontWeight: 800, fontSize: 34, letterSpacing: '0.3em', color: C.text, textAlign: 'center', padding: '10px 0', background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10 }}>
                      {linkToken.token}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button onClick={copyToken} style={{ flex: 1, padding: '10px', borderRadius: 10, background: copied ? C.greenDim : C.white, border: `1px solid ${copied ? '#BBF7D0' : C.border}`, color: copied ? C.greenDeep : C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {copied ? <span style={{ display: 'flex', alignItems: 'center' }}>{IconCheck}</span> : <span style={{ display: 'flex', alignItems: 'center' }}>{IconCopy}</span>}
                        {copied ? 'Tersalin!' : 'Salin Perintah'}
                      </button>
                      {linkToken.deepLink && (
                        <a href={linkToken.deepLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '10px', borderRadius: 10, background: C.tg, color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>{IconTelegram}</span>
                          Buka Bot
                        </a>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>Kirim <strong style={{ color: C.text }}>/link {linkToken.token}</strong> ke bot Telegram Gizku</p>
                    <button onClick={generateLink} disabled={loadingLink} style={{ marginTop: 10, width: '100%', padding: '8px', background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Generate ulang kode baru</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info card — hanya tampil saat belum terhubung */}
        {!tgStatus?.linked && (
          <div style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,.2)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span>💡</span> Cara pakai bot Gizku</div>
            <ul style={{ margin: 0, paddingLeft: 16, color: '#92400E', fontSize: 12, lineHeight: 1.8 }}>
              <li>Kirim foto makanan/minuman ke bot</li>
              <li>Bot akan analisis kandungan nutrisi otomatis</li>
              <li>Hasil analisis tersimpan ke riwayat Gizku kamu</li>
              <li>Lihat riwayat lengkap di halaman <strong>Riwayat</strong></li>
            </ul>
          </div>
        )}
      </div>

      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  )
}
