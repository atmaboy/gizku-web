'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function ConfigPage() {
  const [token, setToken]       = useState('')
  const [limit, setLimit]       = useState('')
  const [apiKey, setApiKey]     = useState('')
  const [aiModel, setAiModel]   = useState('claude-sonnet-4-6')
  const [newPwd, setNewPwd]     = useState('')
  const [mEnabled, setMEnabled] = useState(false)
  const [mTitle, setMTitle]     = useState('')
  const [mDesc, setMDesc]       = useState('')
  const [loading, setLoading]   = useState<string | null>(null)

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
      })
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
              <option value="claude-sonnet-4-6">claude-sonnet-4-6 — Best Balance ✓</option>
              <option value="claude-opus-4-7">claude-opus-4-7 — Paling Canggih</option>
            </optgroup>
            <optgroup label="⚠️ Legacy (mungkin tidak stabil)">
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
    </div>
  )
}
