'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type BetaOptinLang = { title: string; points: string[]; callout: string }
type BetaOptinContent = { enabled: boolean; id: BetaOptinLang; en: BetaOptinLang; updatedAt: string | null }

export default function ConfigPage() {
  const [token, setToken]       = useState('')
  const [limit, setLimit]       = useState('')
  const [apiKey, setApiKey]     = useState('')
  const [aiModel, setAiModel]   = useState('claude-sonnet-5')
  const [newPwd, setNewPwd]     = useState('')
  const [mEnabled, setMEnabled] = useState(false)
  const [mTitle, setMTitle]     = useState('')
  const [mDesc, setMDesc]       = useState('')
  const [verifyHours, setVerifyHours] = useState('72')
  const [loading, setLoading]   = useState<string | null>(null)
  const [betaOptin, setBetaOptin] = useState<BetaOptinContent | null>(null)

  useEffect(() => {
    const t = document.cookie.split(';').find(c => c.includes('nl_admin_token'))?.split('=')[1]?.trim() ?? ''
    setToken(t)
    fetch('/api/admin?action=dashboard', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => setLimit(String(d.stats?.dailyLimit ?? 5)))
      .catch(() => {})
    fetch('/api/admin?action=config', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (d.maintenance) {
          setMEnabled(d.maintenance.enabled ?? false)
          setMTitle(d.maintenance.title ?? '')
          setMDesc(d.maintenance.description ?? '')
        }
        if (d.dailyLimit !== undefined) setLimit(String(d.dailyLimit))
        if (d.anthropicModel) setAiModel(d.anthropicModel)
        if (d.emailVerificationExpiryHours !== undefined) setVerifyHours(String(d.emailVerificationExpiryHours))
      })
      .catch(() => {})
    fetch('/api/admin/beta-optin', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => setBetaOptin(d))
      .catch(() => {})
  }, [])

  async function save(action: string, body: Record<string, unknown>, label: string) {
    setLoading(action + JSON.stringify(body))
    try {
      const r = await fetch(`/api/admin?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok) {
        toast.success(`${label} berhasil disimpan`)
      } else {
        toast.error(d.error ?? 'Terjadi kesalahan')
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setLoading(null)
    }
  }

  const inputCls = "w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-base bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
      <h2 className="font-semibold text-xs uppercase tracking-wide text-[#6B7280] mb-4">{title}</h2>
      {children}
    </div>
  )

  const BtnPrimary = ({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full sm:w-auto bg-[#2ECC71] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#28B765] active:bg-[#1F9D57] transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[44px]"
    >
      {children}
    </button>
  )

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-[#111827]">Pengaturan</h1>

      {/* Limit Harian */}
      <Section title="Batas Analisa Harian">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number" value={limit} onChange={e => setLimit(e.target.value)} min={1} max={9999}
            className={inputCls}
          />
          <BtnPrimary
            onClick={() => save('update_config', { dailyLimit: parseInt(limit) }, 'Limit')}
            disabled={loading !== null}
          >
            {loading !== null ? '…' : 'Simpan'}
          </BtnPrimary>
        </div>
      </Section>

      {/* API Key */}
      <Section title="Anthropic API Key">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-..."
            className={inputCls}
          />
          <BtnPrimary
            onClick={() => save('update_config', { anthropicApiKey: apiKey }, 'API Key')}
            disabled={loading !== null}
          >
            {loading !== null ? '…' : 'Simpan'}
          </BtnPrimary>
        </div>
      </Section>

      {/* Model AI */}
      <Section title="Model AI (Claude)">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={aiModel}
            onChange={e => setAiModel(e.target.value)}
            className={inputCls}
          >
            <optgroup label="✅ Model Aktif (Recommended)">
              <option value="claude-haiku-4-5">claude-haiku-4-5 — Cepat &amp; Hemat</option>
              <option value="claude-sonnet-5">claude-sonnet-5 — Best Balance ✓</option>
              <option value="claude-opus-5">claude-opus-5 — Paling Canggih</option>
            </optgroup>
            <optgroup label="⚠️ Legacy (versi sebelumnya, mungkin tidak stabil)">
              <option value="claude-sonnet-4-6">claude-sonnet-4-6 — Legacy</option>
              <option value="claude-opus-4-7">claude-opus-4-7 — Legacy</option>
              <option value="claude-sonnet-4-5">claude-sonnet-4-5 — Legacy</option>
            </optgroup>
          </select>
          <BtnPrimary
            onClick={() => save('update_config', { anthropicModel: aiModel }, 'Model AI')}
            disabled={loading !== null}
          >
            {loading !== null ? '…' : 'Simpan'}
          </BtnPrimary>
        </div>
        <p className="text-xs text-[#6B7280] mt-2">
          Ganti ke model lebih ringan jika muncul error &quot;Server AI sedang sibuk&quot;. Sistem akan otomatis retry 3x sebelum menyerah.
        </p>
      </Section>

      {/* Verifikasi Email */}
      <Section title="Verifikasi Email">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number" value={verifyHours} onChange={e => setVerifyHours(e.target.value)} min={1} max={120}
            className={inputCls}
          />
          <BtnPrimary
            onClick={() => save('update_config', { emailVerificationExpiryHours: parseInt(verifyHours) }, 'Masa berlaku verifikasi email')}
            disabled={loading !== null}
          >
            {loading !== null ? '…' : 'Simpan'}
          </BtnPrimary>
        </div>
        <p className="text-xs text-[#6B7280] mt-2">
          Masa berlaku link verifikasi email (dalam jam). Default 72 jam (3 hari), maksimal 120 jam (5 hari).
        </p>
      </Section>

      {/* Password */}
      <Section title="Password Admin">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 karakter"
            className={inputCls}
          />
          <BtnPrimary
            onClick={() => save('update_password', { newPassword: newPwd }, 'Password')}
            disabled={loading !== null || newPwd.length < 8}
          >
            {loading !== null ? '…' : 'Ubah'}
          </BtnPrimary>
        </div>
      </Section>

      {/* Maintenance */}
      <Section title="Mode Maintenance">
        <div className="space-y-3">
          <button
            type="button" onClick={() => setMEnabled(!mEnabled)}
            role="switch" aria-checked={mEnabled}
            className="flex items-center gap-3 min-h-[44px]"
          >
            <div className={`w-10 h-6 rounded-full transition-colors relative ${mEnabled ? 'bg-[#2ECC71]' : 'bg-[#E5E7EB]'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${mEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm font-medium text-[#111827]">{mEnabled ? 'Aktif — aplikasi offline' : 'Nonaktif'}</span>
          </button>
          <input
            value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="Judul maintenance"
            className={inputCls}
          />
          <textarea
            value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="Deskripsi" rows={2}
            className={`${inputCls} resize-none`}
          />
          <BtnPrimary
            onClick={() => save('update_maintenance', { enabled: mEnabled, title: mTitle, description: mDesc }, 'Maintenance')}
            disabled={loading !== null}
          >
            {loading !== null ? '…' : 'Simpan Maintenance'}
          </BtnPrimary>
        </div>
      </Section>

      {/* Closed Beta Tester Android */}
      {betaOptin && (
        <BetaOptinSection
          token={token}
          content={betaOptin}
          onChange={setBetaOptin}
        />
      )}
    </div>
  )
}

function BetaOptinSection({
  token, content, onChange,
}: {
  token: string
  content: BetaOptinContent
  onChange: (c: BetaOptinContent) => void
}) {
  const [previewLang, setPreviewLang] = useState<'id' | 'en'>('id')
  const [editLang, setEditLang]       = useState<'id' | 'en'>('id')
  const [modalOpen, setModalOpen]     = useState(false)
  const [draft, setDraft]             = useState<{ id: BetaOptinLang; en: BetaOptinLang } | null>(null)
  const [saving, setSaving]           = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)

  async function toggleEnabled() {
    const next = !content.enabled
    setTogglingEnabled(true)
    try {
      const r = await fetch('/api/admin/beta-optin?action=update_enabled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: next }),
      })
      const d = await r.json()
      if (r.ok) {
        onChange({ ...content, enabled: next })
        toast.success(`Opsi opt-in ${next ? 'diaktifkan' : 'dinonaktifkan'}`)
      } else {
        toast.error(d.error ?? 'Terjadi kesalahan')
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setTogglingEnabled(false)
    }
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

  async function saveModal() {
    if (!draft) return
    setSaving(true)
    try {
      const r = await fetch('/api/admin/beta-optin?action=update_content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(draft),
      })
      const d = await r.json()
      if (r.ok) {
        onChange({ ...content, id: draft.id, en: draft.en, updatedAt: new Date().toISOString() })
        toast.success('Konten popup tersimpan')
        closeModal()
      } else {
        toast.error(d.error ?? 'Terjadi kesalahan')
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
  const preview = content[previewLang]
  const updatedAtLabel = content.updatedAt
    ? new Date(content.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="font-semibold text-xs uppercase tracking-wide text-[#374151] mb-1.5">Closed Beta Tester Android</h2>
          <p className="text-sm text-[#374151] leading-relaxed max-w-md">Tampilkan opsi opt-in program closed tester Android pada halaman registrasi user.</p>
        </div>
        <button
          type="button" onClick={toggleEnabled} disabled={togglingEnabled}
          role="switch" aria-checked={content.enabled} aria-label="Aktifkan opsi opt-in"
          className="flex-shrink-0 disabled:opacity-50"
        >
          <div className={`w-10 h-6 rounded-full transition-colors relative ${content.enabled ? 'bg-[#2ECC71]' : 'bg-[#E5E7EB]'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${content.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      <div className={`mt-3.5 px-3 py-2.5 rounded-lg text-xs leading-relaxed ${content.enabled ? 'bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D]' : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280]'}`}>
        {content.enabled ? 'Aktif — opsi ini muncul di halaman registrasi.' : 'Nonaktif — opsi ini disembunyikan sepenuhnya dari halaman registrasi.'}
      </div>

      <div className="h-px bg-[#F3F4F6] my-5" />

      <div className="flex justify-between items-start gap-4 mb-2.5">
        <h3 className="font-semibold text-xs uppercase tracking-wide text-[#374151]">Konten Popup Penjelasan</h3>
        <div className="flex gap-1.5 flex-shrink-0">
          {(['id', 'en'] as const).map(l => (
            <button
              key={l} type="button" onClick={() => setPreviewLang(l)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${previewLang === l ? 'bg-[#2ECC71] text-white border-[#2ECC71]' : 'bg-white text-[#374151] border-[#E5E7EB]'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-[#111827] mb-1.5">{preview.title || <span className="italic text-[#9CA3AF] font-normal">Belum diisi</span>}</div>
          {preview.points.length > 0 ? (
            <ul className="list-disc pl-[18px] text-xs text-[#6B7280] leading-relaxed space-y-0.5">
              {preview.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          ) : (
            <p className="text-xs italic text-[#9CA3AF]">Belum ada poin syarat & ketentuan</p>
          )}
          <p className="text-xs text-[#9CA3AF] mt-2.5">Terakhir diubah: {updatedAtLabel}</p>
        </div>
        <button
          type="button" onClick={openModal}
          className="flex-shrink-0 bg-white text-[#374151] border-[1.5px] border-[#E5E7EB] rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap hover:bg-[#F9FAFB] transition"
        >
          Edit Konten
        </button>
      </div>

      {modalOpen && draft && (
        <div onClick={closeModal} className="fixed inset-0 bg-[#111827]/45 flex items-center justify-center z-50 p-5">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[560px] max-w-full max-h-[85vh] flex flex-col p-5.5 box-border">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-base font-extrabold text-[#111827]">Edit Konten Popup</h3>
              <button onClick={closeModal} className="text-xl text-[#6B7280] leading-none">&times;</button>
            </div>

            <div className="flex border-b border-[#E5E7EB] mb-4 flex-shrink-0">
              {(['id', 'en'] as const).map(l => (
                <div
                  key={l} onClick={() => setEditLang(l)}
                  className={`flex-1 text-center py-2.5 cursor-pointer text-[13.5px] font-bold border-b-2 transition ${editLang === l ? 'border-[#2ECC71] text-[#15803D]' : 'border-transparent text-[#6B7280]'}`}
                >
                  {l === 'id' ? 'Bahasa Indonesia' : 'English'}
                </div>
              ))}
            </div>

            <div className="overflow-y-auto flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1.5">Judul Popup</label>
                <input value={draft[editLang].title} onChange={e => setDraftField(editLang, 'title', e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1.5">Syarat &amp; Ketentuan (poin bernomor)</label>
                <div className="flex flex-col gap-2">
                  {draft[editLang].points.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={p} onChange={e => setDraftPoint(editLang, i, e.target.value)} className={`${inputCls} flex-1`} />
                      <button
                        type="button" onClick={() => removePoint(editLang, i)}
                        className="flex-shrink-0 w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white text-red-500 text-sm"
                      >&times;</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addPoint(editLang)} className="mt-2 text-[#15803D] text-xs font-semibold">+ Tambah poin</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1.5">Catatan Penekanan (kotak hijau)</label>
                <textarea value={draft[editLang].callout} onChange={e => setDraftField(editLang, 'callout', e.target.value)} rows={3} className={`${inputCls} resize-y`} />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-4.5 flex-shrink-0">
              <button onClick={closeModal} className="px-4.5 py-2.5 rounded-lg border-[1.5px] border-[#E5E7EB] bg-white text-[#374151] text-sm font-semibold">Batal</button>
              <button onClick={saveModal} disabled={saving} className="px-5 py-2.5 rounded-lg border-none bg-[#111827] text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
