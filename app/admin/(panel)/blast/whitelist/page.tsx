'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Globe, Lock, Plus, Trash2 } from 'lucide-react'
import { fmtDate } from '@/lib/utils'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Alert, Badge, Button, Card, DataTable, EmptyState, FormField, Input, Modal } from '@/components/admin/ui'
import { normalizeDomain } from '@/lib/notificationLinks'

type Entry = { id: string; domain: string; includeSubdomains: boolean; isDefault: boolean; createdBy: string | null; createdAt: string }
type Msg = { kind: 'hint' | 'error' | 'success'; text: string }

const HINT: Msg = { kind: 'hint', text: 'Tulis domain saja, tanpa https:// atau path. Contoh: partner.co.id' }

export default function WhitelistPage() {
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [domain, setDomain] = useState('')
  const [subs, setSubs] = useState(true)
  const [msg, setMsg] = useState<Msg>(HINT)
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const res = await fetch('/api/admin/link-whitelist')
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Gagal memuat data (${res.status})`)
      setRows(d.domains ?? [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat whitelist')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function add() {
    const normalized = normalizeDomain(domain)
    if (!normalized) { setMsg({ kind: 'error', text: 'Format domain belum benar. Contoh: partner.co.id' }); return }
    if (rows.some(r => r.domain === normalized)) { setMsg({ kind: 'error', text: `${normalized} sudah ada di whitelist.` }); return }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/link-whitelist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: normalized, includeSubdomains: subs }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg({ kind: 'error', text: d.error ?? 'Gagal menambah domain' }); return }
      setMsg({ kind: 'success', text: `${normalized} ditambahkan ke whitelist.` })
      setDomain('')
      load()
    } catch {
      setMsg({ kind: 'error', text: 'Gagal menghubungi server. Coba lagi.' })
    } finally {
      setAdding(false)
    }
  }

  async function remove(e: Entry) {
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/link-whitelist', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e.id }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Gagal menghapus domain'); return }
      toast.success(`${e.domain} dihapus dari whitelist`)
      setToDelete(null)
      load()
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setDeleting(false)
    }
  }

  const msgTone = msg.kind === 'error' ? 'text-rose-600' : msg.kind === 'success' ? 'text-green-700' : 'text-secondary'

  return (
    <AdminPage title="Whitelist Domain" breadcrumb={[{ label: 'Blast Notifikasi', href: '/admin/blast' }, { label: 'Whitelist Domain' }]}>
      <Alert variant="info" icon={Globe}>
        Blast Push hanya boleh membuka tautan web dari domain di daftar ini. Tautan dibuka di webview dalam aplikasi Gizku, dan app ikut mengecek daftar ini sebelum membukanya.
      </Alert>

      <Card outline="brand" icon={Plus} title="Tambah domain">
        <form onSubmit={e => { e.preventDefault(); add() }} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <FormField label="Domain" htmlFor="wl-domain" className="lg:flex-1 lg:max-w-[420px]">
            <Input
              id="wl-domain" value={domain} invalid={msg.kind === 'error'} autoComplete="off" inputMode="url"
              aria-describedby="wl-msg" placeholder="contoh: partner.co.id"
              onChange={e => { setDomain(e.target.value); if (msg.kind !== 'hint') setMsg(HINT) }}
            />
          </FormField>
          <label className="flex items-center gap-2 min-h-[38px] max-lg:min-h-11 text-base text-primary cursor-pointer">
            <input type="checkbox" checked={subs} onChange={e => setSubs(e.target.checked)} className="accent-[var(--green-600)] w-4 h-4" />
            Termasuk subdomain
          </label>
          <Button type="submit" icon={Plus} loading={adding} disabled={!domain.trim() || adding}>Tambah</Button>
        </form>
        <p id="wl-msg" role={msg.kind === 'hint' ? undefined : 'status'} className={`text-sm mt-2.5 ${msgTone}`}>{msg.text}</p>
      </Card>

      <Card
        icon={Globe} title="Domain terdaftar" subtitle={`${rows.length} domain`} noPadding
        footer={<p className="text-sm text-secondary leading-normal">Menghapus domain tidak mengubah blast yang sudah terkirim, tapi tautannya tidak akan dibuka lagi di app. User akan diarahkan ke detail notifikasi.</p>}
      >
        {loadError ? (
          <div className="p-4"><Alert variant="danger" action={<Button variant="outline" size="sm" onClick={load}>Coba Lagi</Button>}>{loadError}</Alert></div>
        ) : (
          <DataTable
            rows={rows} rowKey={r => r.id} loading={loading} minWidth={620} caption="Domain yang diizinkan untuk tautan blast"
            emptyState={<EmptyState icon={Globe} title="Belum ada domain" description="Tambahkan domain di atas." />}
            columns={[
              { key: 'd', header: 'Domain', render: r => (
                <span className="inline-flex items-center gap-2 font-semibold text-primary break-all">
                  {r.domain}{r.isDefault && <Badge variant="soft">Default</Badge>}
                </span>
              ) },
              { key: 'c', header: 'Cakupan', className: 'text-bark-700', render: r => r.includeSubdomains ? `${r.domain} + semua subdomain` : `Hanya ${r.domain}` },
              { key: 'a', header: 'Ditambahkan', className: 'text-secondary whitespace-nowrap', render: r => `${r.createdBy ?? '—'} · ${fmtDate(r.createdAt)}` },
              { key: 'x', header: 'Aksi', align: 'right', render: r => r.isDefault
                ? <span className="inline-flex items-center gap-1.5 text-sm text-secondary whitespace-nowrap"><Lock size={14} aria-hidden />Tidak bisa dihapus</span>
                : <Button variant="outline-danger" size="sm" icon={Trash2} onClick={() => setToDelete(r)}>Hapus</Button> },
            ]}
          />
        )}
      </Card>

      <Modal
        open={!!toDelete} onClose={() => setToDelete(null)} closeDisabled={deleting} title="Hapus domain?" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>Batal</Button>
          <Button variant="danger" icon={Trash2} loading={deleting} onClick={() => toDelete && remove(toDelete)}>Ya, Hapus</Button>
        </>}
      >
        <p className="text-base text-bark-700 leading-normal">
          <strong className="text-primary">{toDelete?.domain}</strong> tidak akan bisa dipakai lagi untuk tautan blast baru. Blast terjadwal yang memakai domain ini akan dibatalkan saat jam kirim.
        </p>
      </Modal>
    </AdminPage>
  )
}
