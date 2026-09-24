'use client'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertOctagon, Ban, BarChart3, ChevronDown, ChevronLeft, ChevronUp, Clock, Eye, Hourglass, Info, ListChecks,
  MousePointerClick, RefreshCw, Send, Server, Target,
} from 'lucide-react'
import { fmtDateTime, fmtNum, cn } from '@/lib/utils'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Badge, Button, Card, Code, EmptyState, KeyValue, ListRow, Pagination, Progress, ResponsiveStat, Skeleton,
  type BadgeVariant,
} from '@/components/admin/ui'
import { BLAST_STATUS_BADGE, BLAST_STATUS_LABEL, ChannelLabel } from '@/components/admin/blast/shared'

type Blast = {
  id: string
  batchName: string
  channel: 'push' | 'telegram' | 'email'
  title: string
  body: string
  targetType: string
  targetUsernames: string[] | null
  fromAddress: string | null
  status: 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  targetedCount: number
  sentCount: number
  clickedCount: number
  readCount: number
  failedCount: number
}
type Failure = { errorMessage: string | null; count: number }
type Provider = { provider: string; targeted: number; success: number; failed: number }
type Recipient = {
  id: string
  username: string | null
  telegramUsername: string | null
  telegramFirstName: string | null
  email: string | null
  provider: string | null
  status: 'pending' | 'sent' | 'failed'
  errorMessage: string | null
  providerMessageId: string | null
  providerResponse: unknown
  receiptCheckedAt: string | null
  sentAt: string | null
  clickedAt: string | null
  readAt: string | null
}


const RECIPIENT_STATUS_LABEL: Record<Recipient['status'], string> = {
  pending: 'Pending', sent: 'Terkirim', failed: 'Gagal',
}
const RECIPIENT_STATUS_BADGE: Record<Recipient['status'], BadgeVariant> = {
  pending: 'light', sent: 'success', failed: 'danger',
}
const FAILURE_TONES = ['rose', 'honey', 'clay'] as const

function recipientLabel(r: Recipient) {
  return r.email ?? (r.username ? `@${r.username}` : r.telegramUsername ? `@${r.telegramUsername}` : (r.telegramFirstName ?? '—'))
}

const PROVIDER_LABEL: Record<string, string> = {
  fcm: 'FCM — Google (Android)',
  apns: 'APNs — Apple (iOS)',
  telegram: 'Telegram Bot API',
  resend: 'Resend (Email)',
}
const SENDER_LABEL: Record<string, string> = {
  support: 'Gizku Support <support@gizku.com>',
  marketing: 'Gizku Marketing <marketing@gizku.com>',
}

function pct(a: number, b: number) {
  if (!b) return '0.0'
  return ((a / b) * 100).toFixed(1)
}

export default function BlastDetailPage() {
  const params = useParams<{ id: string }>()
  const [blast, setBlast] = useState<Blast | null>(null)
  const [failures, setFailures] = useState<Failure[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [checkingReceipts, setCheckingReceipts] = useState(false)

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(true)
  const [recipientsPage, setRecipientsPage] = useState(1)
  const [recipientsTotalPages, setRecipientsTotalPages] = useState(1)
  const [recipientsTotal, setRecipientsTotal] = useState(0)
  const [expandedRecipient, setExpandedRecipient] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/blast?action=detail&id=${params.id}`)
      const d = await res.json()
      if (res.ok) {
        setBlast(d.blast); setFailures(d.failures ?? []); setProviders(d.providers ?? [])
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  const loadRecipients = useCallback(async (page: number) => {
    setRecipientsLoading(true)
    try {
      const res = await fetch(`/api/admin/blast?action=recipients&id=${params.id}&page=${page}&per_page=25`)
      const d = await res.json()
      if (res.ok) {
        setRecipients(d.recipients ?? [])
        setRecipientsPage(d.page ?? page)
        setRecipientsTotalPages(d.totalPages ?? 1)
        setRecipientsTotal(d.total ?? 0)
      }
    } catch {
      // biarkan daftar sebelumnya, bukan blocker utama halaman
    } finally {
      setRecipientsLoading(false)
    }
  }, [params.id])

  useEffect(() => { loadDetail() }, [loadDetail])
  useEffect(() => { loadRecipients(1) }, [loadRecipients])

  async function checkReceipts() {
    setCheckingReceipts(true)
    try {
      const res = await fetch('/api/admin/blast?action=check_receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.id }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(d.message)
        await Promise.all([loadDetail(), loadRecipients(recipientsPage)])
      } else {
        toast.error(d.error)
      }
    } catch {
      toast.error('Gagal cek status pengiriman, coba lagi')
    } finally {
      setCheckingReceipts(false)
    }
  }

  const crumbs = [{ label: 'Blast Notifikasi', href: '/admin/blast' }, { label: blast?.batchName ?? 'Detail Batch' }]

  if (loading) {
    return (
      <AdminPage title="Detail Batch" breadcrumb={crumbs}>
        <Skeleton className="h-[220px] rounded-md" />
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-5 max-lg:gap-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[90px] rounded-md" />)}</div>
      </AdminPage>
    )
  }
  if (notFound || !blast) {
    return (
      <AdminPage title="Detail Batch" breadcrumb={crumbs}>
        <Card>
          <EmptyState
            icon={AlertOctagon}
            title="Batch tidak ditemukan."
            action={<Button variant="outline" icon={ChevronLeft} href="/admin/blast">Kembali ke Riwayat</Button>}
          />
        </Card>
      </AdminPage>
    )
  }

  const targetLabel = blast.targetType === 'all' ? 'Semua User' : `${(blast.targetUsernames ?? []).length} ${blast.channel === 'email' ? 'email' : 'username'}`
  const sendTimeLabel = (blast.status === 'scheduled' || blast.status === 'cancelled') ? fmtDateTime(blast.scheduledAt) : fmtDateTime(blast.sentAt)
  const deliveredTimeLabel = (blast.status === 'completed' || blast.status === 'failed') ? fmtDateTime(blast.sentAt) : '—'
  const hasStats = blast.status === 'completed' || blast.status === 'failed'
  const isChannelPush = blast.channel === 'push'
  const isChannelEmail = blast.channel === 'email'
  const hasClickTracking = isChannelPush
  const failedWithReason = failures.filter(f => f.count > 0)
  const totalFailedForPct = blast.failedCount

  const meta = [
    { label: 'Channel', value: <ChannelLabel channel={blast.channel} /> },
    ...(isChannelEmail && blast.fromAddress ? [{ label: 'Pengirim', value: SENDER_LABEL[blast.fromAddress] ?? blast.fromAddress }] : []),
    { label: 'Target', value: targetLabel },
    { label: 'Dibuat', value: fmtDateTime(blast.createdAt) },
    { label: 'Waktu Pengiriman', value: sendTimeLabel },
    { label: 'Waktu Terkirim', value: deliveredTimeLabel },
  ]
  const dash = '—'
  const stat = (n: number) => hasStats ? fmtNum(n) : dash

  const checkBtn = hasStats && isChannelPush && (
    <Button variant="outline-primary" icon={RefreshCw} loading={checkingReceipts} onClick={checkReceipts} className="max-lg:w-full">
      {checkingReceipts ? 'Mengecek…' : 'Cek Status Pengiriman'}
    </Button>
  )

  return (
    <AdminPage title="Detail Batch" breadcrumb={crumbs}>
      <div><Button variant="outline" size="sm" icon={ChevronLeft} href="/admin/blast">Kembali ke Riwayat</Button></div>

      <Card outline="brand">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-secondary">Nama Batch</p>
            <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
              <h2 className="text-[22px] max-lg:text-xl font-semibold text-primary break-words">{blast.batchName}</h2>
              <Badge variant={BLAST_STATUS_BADGE[blast.status]}>{BLAST_STATUS_LABEL[blast.status]}</Badge>
            </div>
          </div>
          <div className="max-lg:hidden">{checkBtn}</div>
        </div>

        <dl className="max-lg:hidden grid grid-cols-3 xl:grid-cols-6 gap-4 mt-4 pt-4 border-t border-border">
          {meta.map(m => (
            <div key={m.label} className="min-w-0">
              <dt className="text-sm text-secondary">{m.label}</dt>
              <dd className="text-base font-semibold text-primary mt-0.5 break-words">{m.value}</dd>
            </div>
          ))}
        </dl>
        <KeyValue className="lg:hidden mt-3 border-t border-border" dense items={meta} />

        <div className="bg-sunken border border-border rounded-sm px-4 py-3.5 mt-4">
          {(isChannelPush || isChannelEmail) && (
            <>
              <p className="text-sm text-secondary">{isChannelEmail ? 'Subjek Email' : 'Judul Notifikasi'}</p>
              <p className="text-base font-semibold text-primary mb-3 break-words">{blast.title}</p>
            </>
          )}
          <p className="text-sm text-secondary">{isChannelPush ? 'Isi Pesan' : isChannelEmail ? 'Isi Email' : 'Isi Chat Telegram'}</p>
          <p className="text-base text-bark-700 leading-normal whitespace-pre-wrap break-words">{blast.body}</p>
        </div>
        {checkBtn && <div className="lg:hidden mt-4">{checkBtn}</div>}
      </Card>

      {blast.status === 'scheduled' && (
        <Alert variant="light" icon={Clock}>Notifikasi ini masih menunggu jadwal pengiriman. Metrik akan terisi setelah batch dikirim.</Alert>
      )}
      {blast.status === 'cancelled' && (
        <Alert variant="light" icon={Ban}>Notifikasi terjadwal ini dibatalkan sebelum dikirim.</Alert>
      )}
      {blast.status === 'sending' && (
        <Alert variant="warning" icon={Hourglass}>Notifikasi sedang dalam proses pengiriman.</Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-5 max-lg:gap-3">
        <ResponsiveStat icon={Target} iconTone="sand" label="Ditargetkan" value={stat(blast.targetedCount)} />
        <ResponsiveStat
          icon={Send} iconTone="brand" label="Terkirim" value={stat(blast.sentCount)}
          progress={hasStats ? Number(pct(blast.sentCount, blast.targetedCount)) : undefined}
          description={hasStats ? `${pct(blast.sentCount, blast.targetedCount)}% dari target` : undefined}
        />
        <ResponsiveStat
          icon={Eye} iconTone="green" label="Dibaca" value={stat(blast.readCount)}
          description={hasStats ? `${pct(blast.readCount, blast.sentCount)}% dari terkirim` : undefined}
        />
        <ResponsiveStat
          icon={MousePointerClick} iconTone="honey" label={hasClickTracking ? 'Diklik' : 'Diklik (n/a)'}
          value={hasClickTracking ? stat(blast.clickedCount) : 'n/a'}
          description={hasClickTracking && hasStats ? `${pct(blast.clickedCount, blast.sentCount)}% dari terkirim` : undefined}
        />
        <div className="max-xl:col-span-2 min-w-0">
          <ResponsiveStat
            icon={AlertOctagon} iconTone="danger" label="Gagal" value={stat(blast.failedCount)}
            description={hasStats ? `${pct(blast.failedCount, blast.targetedCount)}% dari target` : undefined}
          />
        </div>
      </div>

      {hasStats && isChannelPush && (
        <Alert variant="info" icon={Info} title="“Terkirim” di atas cuma berarti Expo sudah menerima pesannya">
          — bukan bukti sudah sampai ke perangkat. Klik “Cek Status Pengiriman” untuk cek status asli dari Expo (butuh beberapa menit sejak dikirim sebelum receipt-nya siap).
        </Alert>
      )}

      {hasStats && (failedWithReason.length > 0 || providers.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
          {failedWithReason.length > 0 && (
            <Card title="Rincian Kegagalan Pengiriman" icon={BarChart3} className={providers.length > 0 ? 'xl:col-span-7' : 'xl:col-span-12'}>
              <div className="flex flex-col gap-3.5">
                {failedWithReason.map((f, i) => {
                  const p = pct(f.count, totalFailedForPct)
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-start gap-3 mb-1.5">
                        <Code>{f.errorMessage ?? 'Tidak diketahui'}</Code>
                        <span className="text-sm text-primary font-semibold whitespace-nowrap tabular-nums">{fmtNum(f.count)} <span className="text-secondary font-normal">({p}%)</span></span>
                      </div>
                      <Progress value={Number(p)} tone={FAILURE_TONES[i % FAILURE_TONES.length]} height={6} label={f.errorMessage ?? 'Tidak diketahui'} />
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
          {providers.length > 0 && (
            <Card title="Per Provider" icon={Server} noPadding className={failedWithReason.length > 0 ? 'xl:col-span-5' : 'xl:col-span-12'}>
              <div className="max-lg:hidden overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Provider', 'Target', 'Sukses', 'Gagal'].map((h, i) => (
                        <th key={h} scope="col" className={cn('px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border whitespace-nowrap', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map(p => (
                      <tr key={p.provider}>
                        <td className="px-3 py-2.5 border-t border-border text-base font-medium">{PROVIDER_LABEL[p.provider] ?? p.provider}</td>
                        <td className="px-3 py-2.5 border-t border-border text-base text-right tabular-nums">{fmtNum(p.targeted)}</td>
                        <td className="px-3 py-2.5 border-t border-border text-base text-right tabular-nums text-green-700 font-semibold">{fmtNum(p.success)}</td>
                        <td className="px-3 py-2.5 border-t border-border text-base text-right tabular-nums text-rose-600 font-semibold">{fmtNum(p.failed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden p-4 flex flex-col gap-3">
                {providers.map(p => (
                  <div key={p.provider}>
                    <p className="text-base font-semibold text-primary">{PROVIDER_LABEL[p.provider] ?? p.provider}</p>
                    <KeyValue dense items={[
                      { label: 'Ditargetkan', value: fmtNum(p.targeted) },
                      { label: 'Sukses', value: <span className="text-green-700">{fmtNum(p.success)}</span> },
                      { label: 'Gagal', value: <span className="text-rose-600">{fmtNum(p.failed)}</span> },
                    ]} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {hasStats && (
        <Card
          title="Log Pengiriman"
          icon={ListChecks}
          subtitle="Status mentah per-penerima, termasuk response asli dari provider — klik baris untuk lihat detail."
          tools={<span className="text-sm text-secondary whitespace-nowrap">{fmtNum(recipientsTotal)} penerima</span>}
          noPadding
          footer={!recipientsLoading && recipients.length > 0 ? (
            <Pagination page={recipientsPage} totalPages={recipientsTotalPages} onPage={loadRecipients} label={`Hal. ${recipientsPage} / ${recipientsTotalPages}`} />
          ) : undefined}
        >
          {/* Desktop */}
          <div className="max-lg:hidden overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr>
                  {[isChannelEmail ? 'Email' : 'Username', 'Provider', 'Status', 'Error', 'Waktu Kirim', 'Receipt Dicek'].map(h => (
                    <th key={h} scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipientsLoading && (
                  <tr><td colSpan={6} className="p-4"><div className="flex flex-col gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-5" />)}</div></td></tr>
                )}
                {!recipientsLoading && recipients.length === 0 && (
                  <tr><td colSpan={6}><EmptyState icon={ListChecks} title="Belum ada data penerima." /></td></tr>
                )}
                {!recipientsLoading && recipients.map((r, i) => {
                  const open = expandedRecipient === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className={cn('hover:bg-muted/60', i % 2 === 0 && 'bg-sunken')}>
                        <td className="px-3 py-2.5 border-t border-border text-base font-medium whitespace-nowrap">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={`rcpt-${r.id}`}
                            onClick={() => setExpandedRecipient(open ? null : r.id)}
                            className="inline-flex items-center gap-1.5 text-left hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-xs"
                          >
                            {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                            {recipientLabel(r)}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 border-t border-border text-base text-secondary whitespace-nowrap">{r.provider ? (PROVIDER_LABEL[r.provider] ?? r.provider) : '—'}</td>
                        <td className="px-3 py-2.5 border-t border-border"><Badge variant={RECIPIENT_STATUS_BADGE[r.status]}>{RECIPIENT_STATUS_LABEL[r.status]}</Badge></td>
                        <td className="px-3 py-2.5 border-t border-border max-w-[220px]">{r.errorMessage ? <Code className="block truncate">{r.errorMessage}</Code> : <span className="text-secondary">—</span>}</td>
                        <td className="px-3 py-2.5 border-t border-border text-base text-secondary whitespace-nowrap">{fmtDateTime(r.sentAt)}</td>
                        <td className="px-3 py-2.5 border-t border-border text-base text-secondary whitespace-nowrap">{r.receiptCheckedAt ? fmtDateTime(r.receiptCheckedAt) : '—'}</td>
                      </tr>
                      {open && (
                        <tr id={`rcpt-${r.id}`} className={i % 2 === 0 ? 'bg-sunken' : undefined}>
                          <td colSpan={6} className="px-3 pb-3">
                            <RawJson r={r} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="lg:hidden">
            {recipientsLoading && <div className="p-4 flex flex-col gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>}
            {!recipientsLoading && recipients.length === 0 && <EmptyState icon={ListChecks} title="Belum ada data penerima." />}
            {!recipientsLoading && recipients.map(r => {
              const open = expandedRecipient === r.id
              return (
                <div key={r.id} className="border-t border-border first:border-t-0">
                  <ListRow
                    onClick={() => setExpandedRecipient(open ? null : r.id)}
                    title={recipientLabel(r)}
                    meta={<>{r.provider ? (PROVIDER_LABEL[r.provider] ?? r.provider) : '—'} · {fmtDateTime(r.sentAt)}{r.errorMessage ? ` · ${r.errorMessage}` : ''}</>}
                    trailing={<><Badge variant={RECIPIENT_STATUS_BADGE[r.status]} size="sm">{RECIPIENT_STATUS_LABEL[r.status]}</Badge>{open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}</>}
                    className="border-t-0"
                  />
                  {open && <div className="px-3.5 pb-3"><RawJson r={r} /></div>}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </AdminPage>
  )
}

function RawJson({ r }: { r: Recipient }) {
  return (
    <pre className="bg-bark-900 text-green-200 text-xs leading-relaxed p-3.5 rounded-sm overflow-x-auto font-mono">
{JSON.stringify({
  providerMessageId: r.providerMessageId,
  clickedAt: r.clickedAt,
  readAt: r.readAt,
  providerResponse: r.providerResponse,
}, null, 2)}
    </pre>
  )
}
