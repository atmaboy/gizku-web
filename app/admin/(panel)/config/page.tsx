'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle, Camera, Cpu, Eye, EyeOff, KeyRound, Lock, Mail, Pencil, Plus, Shield, Smartphone, X,
} from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import ConfirmPasswordModal, { type ConfirmRequest } from '@/components/admin/ConfirmPasswordModal'
import {
  Alert, AddonButton, Button, Card, FormField, Input, InputGroup, Modal, Select, Skeleton, Switch, Tabs, Textarea,
} from '@/components/admin/ui'

type BetaOptinLang = { title: string; points: string[]; callout: string }
type BetaOptinContent = { enabled: boolean; id: BetaOptinLang; en: BetaOptinLang; updatedAt: string | null }

type SaveResult = { ok: true } | { ok: false; status: number; error: string }

/** POST helper shared by every protected action on this page. */
async function postJson(url: string, body: Record<string, unknown>): Promise<SaveResult> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok) return { ok: true }
    return { ok: false, status: r.status, error: d.error ?? 'Terjadi kesalahan' }
  } catch {
    return { ok: false, status: 0, error: 'Gagal menghubungi server' }
  }
}

export default function ConfigPage() {
  const [limit, setLimit]       = useState('')
  const [apiKey, setApiKey]     = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showKey, setShowKey]   = useState(false)
  const [aiModel, setAiModel]   = useState('claude-sonnet-5')
  const [newPwd, setNewPwd]     = useState('')
  const [mEnabled, setMEnabled] = useState(false)
  const [mTitle, setMTitle]     = useState('')
  const [mDesc, setMDesc]       = useState('')
  const [verifyHours, setVerifyHours] = useState('72')
  const [loaded, setLoaded]     = useState(false)
  const [betaOptin, setBetaOptin] = useState<BetaOptinContent | null>(null)

  const [confirm, setConfirm]   = useState<ConfirmRequest | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetch('/api/admin?action=config')
      .then(r => r.json())
      .then(d => {
        if (d.maintenance) {
          setMEnabled(d.maintenance.enabled ?? false)
          setMTitle(d.maintenance.title ?? '')
          setMDesc(d.maintenance.description ?? '')
        }
        if (d.globalLimit !== undefined) setLimit(String(d.globalLimit))
        if (d.anthropicModel) setAiModel(d.anthropicModel)
        setHasApiKey(!!d.apiKey)
        if (d.emailVerificationExpiryHours !== undefined) setVerifyHours(String(d.emailVerificationExpiryHours))
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
    fetch('/api/admin/beta-optin')
      .then(r => r.json())
      .then(d => setBetaOptin(d))
      .catch(() => {})
  }, [])

  /**
   * Opens the password confirmation, then runs `send(adminPassword)`.
   * Success → toast + close. 401 (wrong password) → toast, modal stays open
   * (its input was already cleared on submit). Other errors → toast + close.
   */
  function protect(req: Omit<ConfirmRequest, 'onConfirm'>, send: (pwd: string) => Promise<SaveResult>, successMsg: string, onSuccess?: () => void) {
    setConfirm({
      ...req,
      onConfirm: async (pwd: string) => {
        setConfirming(true)
        const res = await send(pwd)
        setConfirming(false)
        if (res.ok) {
          toast.success(successMsg)
          setConfirm(null)
          onSuccess?.()
        } else {
          toast.error(res.error)
          if (res.status !== 401) setConfirm(null)
        }
      },
    })
  }

  function saveConfig(body: Record<string, unknown>, label: string, req: Omit<ConfirmRequest, 'onConfirm'>, onSuccess?: () => void) {
    protect(req, pwd => postJson('/api/admin?action=update_config', { ...body, adminPassword: pwd }), `${label} berhasil disimpan`, onSuccess)
  }

  const footer = (children: React.ReactNode) => <div className="flex justify-end">{children}</div>

  return (
    <AdminPage title="Pengaturan" breadcrumb={[{ label: 'Pengaturan' }]}>
      <Alert variant="light" icon={Shield}>
        Setiap perubahan di halaman ini wajib dikonfirmasi dengan password admin.
      </Alert>

      {!loaded ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 max-lg:gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[220px] rounded-md" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 max-lg:gap-4 items-start">
          {/* 1. Limit harian */}
          <Card
            outline="brand" icon={Camera} title="Batas Analisa Harian"
            footer={footer(
              <Button
                icon={Lock} className="max-lg:w-full"
                disabled={!limit || parseInt(limit) < 1}
                onClick={() => saveConfig({ dailyLimit: parseInt(limit) }, 'Limit', {
                  title: 'Simpan batas analisa harian?',
                  message: 'Limit global berubah untuk semua user yang tidak punya limit khusus.',
                  confirmLabel: 'Simpan', severity: 'green',
                })}
              >Simpan</Button>,
            )}
          >
            <FormField label="Limit global (foto/hari)" htmlFor="cfg-limit" help="Berlaku untuk semua user tanpa limit khusus.">
              <Input id="cfg-limit" type="number" inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value)} min={1} max={9999} />
            </FormField>
          </Card>

          {/* 2. API key */}
          <Card
            outline="brand" icon={KeyRound} title="Anthropic API Key"
            footer={footer(
              <Button
                icon={Lock} className="max-lg:w-full"
                disabled={!apiKey.trim()}
                onClick={() => saveConfig({ anthropicApiKey: apiKey }, 'API Key', {
                  title: 'Ganti Anthropic API Key?',
                  message: 'Semua analisa foto berikutnya akan memakai key baru. Key lama tidak bisa dilihat lagi.',
                  confirmLabel: 'Simpan API Key', severity: 'orange',
                }, () => { setApiKey(''); setHasApiKey(true); setShowKey(false) })}
              >Simpan</Button>,
            )}
          >
            <FormField
              label="API Key" htmlFor="cfg-key"
              help="Key dari halaman ini dipakai lebih dulu untuk analisa di aplikasi. Bot Telegram saat ini membaca ANTHROPIC_API_KEY dari environment."
            >
              <InputGroup append={<AddonButton label={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'} onClick={() => setShowKey(s => !s)}>{showKey ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}</AddonButton>}>
                <Input
                  id="cfg-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? '•••••••• (terpasang — isi untuk mengganti)' : 'sk-ant-...'} autoComplete="off"
                />
              </InputGroup>
            </FormField>
          </Card>

          {/* 3. Model AI */}
          <Card
            outline="brand" icon={Cpu} title="Model AI (Claude)"
            footer={footer(
              <Button
                icon={Lock} className="max-lg:w-full"
                onClick={() => saveConfig({ anthropicModel: aiModel }, 'Model AI', {
                  title: 'Ganti model AI?',
                  message: 'Model baru langsung dipakai untuk semua analisa berikutnya.',
                  confirmLabel: 'Simpan', severity: 'green',
                })}
              >Simpan</Button>,
            )}
          >
            <FormField
              label="Model" htmlFor="cfg-model"
              help={<>Ganti ke model lebih ringan jika muncul error “Server AI sedang sibuk”. Sistem akan otomatis retry 3x sebelum menyerah.</>}
            >
              <Select id="cfg-model" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                <optgroup label="Model Aktif (Recommended)">
                  <option value="claude-haiku-4-5">claude-haiku-4-5 — Cepat &amp; Hemat</option>
                  <option value="claude-sonnet-5">claude-sonnet-5 — Best Balance</option>
                  <option value="claude-opus-5">claude-opus-5 — Paling Canggih</option>
                </optgroup>
                <optgroup label="Legacy (versi sebelumnya, mungkin tidak stabil)">
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6 — Legacy</option>
                  <option value="claude-opus-4-7">claude-opus-4-7 — Legacy</option>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5 — Legacy</option>
                </optgroup>
              </Select>
            </FormField>
          </Card>

          {/* 4. Verifikasi email */}
          <Card
            outline="brand" icon={Mail} title="Verifikasi Email"
            footer={footer(
              <Button
                icon={Lock} className="max-lg:w-full"
                disabled={!verifyHours}
                onClick={() => saveConfig({ emailVerificationExpiryHours: parseInt(verifyHours) }, 'Masa berlaku verifikasi email', {
                  title: 'Simpan masa berlaku verifikasi email?',
                  message: 'Berlaku untuk link verifikasi yang dikirim setelah ini.',
                  confirmLabel: 'Simpan', severity: 'green',
                })}
              >Simpan</Button>,
            )}
          >
            <FormField label="Masa berlaku link (jam)" htmlFor="cfg-verify" help="Default 72 jam (3 hari), maksimal 120 jam (5 hari).">
              <Input id="cfg-verify" type="number" inputMode="numeric" value={verifyHours} onChange={e => setVerifyHours(e.target.value)} min={1} max={120} />
            </FormField>
          </Card>

          {/* 5. Password admin */}
          <Card
            outline="brand" icon={Lock} title="Password Admin"
            footer={footer(
              <Button
                icon={Lock} className="max-lg:w-full"
                disabled={newPwd.length < 8}
                onClick={() => protect(
                  {
                    title: 'Ubah password admin?',
                    message: 'Setelah diubah, gunakan password baru untuk login dan konfirmasi berikutnya.',
                    confirmLabel: 'Ubah Password', severity: 'red',
                    passwordLabel: 'Password admin saat ini',
                  },
                  pwd => postJson('/api/admin?action=update_password', { currentPassword: pwd, newPassword: newPwd }),
                  'Password berhasil disimpan',
                  () => setNewPwd(''),
                )}
              >Ubah</Button>,
            )}
          >
            <FormField label="Password baru" htmlFor="cfg-pwd" help="Min. 8 karakter. Semua sesi admin lain tetap berlaku sampai masa 4 jamnya habis.">
              <Input id="cfg-pwd" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 karakter" autoComplete="new-password" />
            </FormField>
          </Card>

          {/* 6. Maintenance */}
          <Card
            outline="warning" icon={AlertTriangle} title="Mode Maintenance"
            footer={footer(
              <Button
                icon={Lock} className="max-lg:w-full"
                onClick={() => protect(
                  {
                    title: 'Simpan pengaturan maintenance?',
                    message: 'Jika diaktifkan, aplikasi user langsung offline dan user yang sedang aktif otomatis logout.',
                    confirmLabel: 'Simpan Maintenance', severity: 'orange',
                  },
                  pwd => postJson('/api/admin?action=update_maintenance', { enabled: mEnabled, title: mTitle, description: mDesc, adminPassword: pwd }),
                  'Maintenance berhasil disimpan',
                )}
              >Simpan Maintenance</Button>,
            )}
            bodyClassName="flex flex-col gap-4"
          >
            <Switch
              checked={mEnabled} onChange={setMEnabled}
              label={mEnabled ? 'Aktif — aplikasi offline' : 'Nonaktif'}
              description="Saat aktif, aplikasi offline dan user aktif otomatis logout."
            />
            <FormField label="Judul" htmlFor="cfg-mtitle">
              <Input id="cfg-mtitle" value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="Judul maintenance" />
            </FormField>
            <FormField label="Deskripsi" htmlFor="cfg-mdesc">
              <Textarea id="cfg-mdesc" value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="Deskripsi" rows={2} />
            </FormField>
          </Card>
        </div>
      )}

      {betaOptin && (
        <BetaOptinSection content={betaOptin} onChange={setBetaOptin} protect={protect} />
      )}

      <ConfirmPasswordModal request={confirm} loading={confirming} onCancel={() => setConfirm(null)} />
    </AdminPage>
  )
}

type ProtectFn = (req: Omit<ConfirmRequest, 'onConfirm'>, send: (pwd: string) => Promise<SaveResult>, successMsg: string, onSuccess?: () => void) => void

function BetaOptinSection({
  content, onChange, protect,
}: {
  content: BetaOptinContent
  onChange: (c: BetaOptinContent) => void
  protect: ProtectFn
}) {
  const [previewLang, setPreviewLang] = useState<'id' | 'en'>('id')
  const [editLang, setEditLang]       = useState<'id' | 'en'>('id')
  const [modalOpen, setModalOpen]     = useState(false)
  const [draft, setDraft]             = useState<{ id: BetaOptinLang; en: BetaOptinLang } | null>(null)

  // The switch is NOT flipped optimistically — only after the password
  // confirmation succeeds on the server.
  function toggleEnabled() {
    const next = !content.enabled
    protect(
      {
        title: 'Ubah opsi Closed Beta Android?',
        message: 'Opsi opt-in di halaman registrasi user akan ikut berubah.',
        confirmLabel: 'Simpan', severity: 'green',
      },
      pwd => postJson('/api/admin/beta-optin?action=update_enabled', { enabled: next, adminPassword: pwd }),
      `Opsi opt-in ${next ? 'diaktifkan' : 'dinonaktifkan'}`,
      () => onChange({ ...content, enabled: next }),
    )
  }

  function openModal() {
    setEditLang('id')
    setDraft({ id: { ...content.id, points: [...content.id.points] }, en: { ...content.en, points: [...content.en.points] } })
    setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false)
    setDraft(null)
  }

  function setDraftField(lang: 'id' | 'en', field: 'title' | 'callout', value: string) {
    setDraft(d => d && { ...d, [lang]: { ...d[lang], [field]: value } })
  }
  function setDraftPoint(lang: 'id' | 'en', i: number, value: string) {
    setDraft(d => {
      if (!d) return d
      const points = d[lang].points.slice()
      points[i] = value
      return { ...d, [lang]: { ...d[lang], points } }
    })
  }
  function addPoint(lang: 'id' | 'en') {
    setDraft(d => d && { ...d, [lang]: { ...d[lang], points: [...d[lang].points, ''] } })
  }
  function removePoint(lang: 'id' | 'en', i: number) {
    setDraft(d => d && { ...d, [lang]: { ...d[lang], points: d[lang].points.filter((_, idx) => idx !== i) } })
  }

  function saveModal() {
    if (!draft) return
    const snapshot = draft
    protect(
      {
        title: 'Simpan konten popup?',
        message: 'Teks penjelasan Closed Beta di halaman registrasi akan diperbarui.',
        confirmLabel: 'Simpan', severity: 'green',
      },
      pwd => postJson('/api/admin/beta-optin?action=update_content', { ...snapshot, adminPassword: pwd }),
      'Konten popup tersimpan',
      () => {
        onChange({ ...content, id: snapshot.id, en: snapshot.en, updatedAt: new Date().toISOString() })
        closeModal()
      },
    )
  }

  const preview = content[previewLang]
  const updatedAtLabel = content.updatedAt
    ? new Date(content.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <Card icon={Smartphone} title="Closed Beta Tester Android">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3">
          <p className="text-base text-bark-700 leading-normal">Tampilkan opsi opt-in program closed tester Android pada halaman registrasi user.</p>
          <Switch checked={content.enabled} onChange={toggleEnabled} label="Aktifkan opsi opt-in" />
          <Alert variant={content.enabled ? 'info' : 'light'}>
            {content.enabled ? 'Aktif — opsi ini muncul di halaman registrasi.' : 'Nonaktif — opsi ini disembunyikan sepenuhnya dari halaman registrasi.'}
          </Alert>
        </div>

        <div className="rounded-md border border-border bg-sunken p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="text-base font-semibold text-primary">Konten Popup Penjelasan</h3>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Bahasa pratinjau" className="inline-flex">
                {(['id', 'en'] as const).map((l, i) => (
                  <button
                    key={l} type="button" aria-pressed={previewLang === l} onClick={() => setPreviewLang(l)}
                    className={`min-h-8 max-lg:min-h-10 px-2.5 text-xs font-semibold border ${i === 0 ? 'rounded-l-sm' : '-ml-px rounded-r-sm'} ${previewLang === l ? 'bg-brand text-white border-brand' : 'bg-surface text-bark-800 border-border-strong hover:bg-muted'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" icon={Pencil} onClick={openModal}>Edit Konten</Button>
            </div>
          </div>
          <div className="bg-surface rounded-md border border-border p-3.5">
            <p className="text-base font-bold text-primary mb-1.5">{preview.title || <span className="italic text-secondary font-normal">Belum diisi</span>}</p>
            {preview.points.length > 0 ? (
              <ol className="list-decimal pl-5 text-sm text-bark-700 leading-normal space-y-0.5">
                {preview.points.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            ) : (
              <p className="text-sm italic text-secondary">Belum ada poin syarat &amp; ketentuan</p>
            )}
            {preview.callout && (
              <p className="mt-2.5 px-3 py-2 rounded-sm bg-green-50 border border-green-200 text-sm text-green-800">{preview.callout}</p>
            )}
          </div>
          <p className="text-xs text-secondary mt-2.5">Terakhir diubah: {updatedAtLabel}</p>
        </div>
      </div>

      <Modal
        open={modalOpen && !!draft}
        onClose={closeModal}
        title="Edit Konten Popup"
        size="md"
        sheetOnMobile
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Batal</Button>
            <Button icon={Lock} onClick={saveModal}>Simpan</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <Tabs
              variant="tabs"
              ariaLabel="Bahasa konten"
              items={[{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }]}
              value={editLang}
              onChange={setEditLang}
              className="lg:border-b lg:border-border"
            />
            <FormField label="Judul Popup" htmlFor="beta-title">
              <Input id="beta-title" value={draft[editLang].title} onChange={e => setDraftField(editLang, 'title', e.target.value)} />
            </FormField>
            <div>
              <p className="mb-1.5 text-base font-semibold text-primary">Syarat &amp; Ketentuan (poin bernomor)</p>
              <div className="flex flex-col gap-2">
                {draft[editLang].points.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 text-sm text-secondary text-right tabular-nums shrink-0">{i + 1}.</span>
                    <Input aria-label={`Poin ${i + 1}`} value={p} onChange={e => setDraftPoint(editLang, i, e.target.value)} />
                    <Button variant="outline-danger" size="sm" aria-label={`Hapus poin ${i + 1}`} onClick={() => removePoint(editLang, i)} className="px-2 shrink-0"><X size={14} aria-hidden /></Button>
                  </div>
                ))}
              </div>
              <Button variant="link" size="sm" icon={Plus} onClick={() => addPoint(editLang)} className="mt-1.5 px-0">Tambah poin</Button>
            </div>
            <FormField label="Catatan Penekanan (kotak hijau)" htmlFor="beta-callout">
              <Textarea id="beta-callout" value={draft[editLang].callout} onChange={e => setDraftField(editLang, 'callout', e.target.value)} rows={3} />
            </FormField>
          </div>
        )}
      </Modal>
    </Card>
  )
}
