'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BookOpen, Check, Download, Lock, Power, Shield, Sparkles, Target, Users, Activity } from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import ConfirmPasswordModal, { type ConfirmRequest } from '@/components/admin/ConfirmPasswordModal'
import {
  Alert, Badge, Button, buttonClass, Card, FormField, Input, KeyValue, Progress, SegmentedControl, Select, Skeleton, Switch, Textarea,
} from '@/components/admin/ui'
import { fmtNum } from '@/lib/utils'
import {
  FEATURE_KEYS, macroGramsFromKcal, validateGoalsConfig, type FeatureKey, type GoalsConfig,
} from '@/lib/goalsConfig'

type Stats = {
  usersWithGoal: number; premiumActive: number; ctaClicks7d: number; macroLocked7d: number
  remindYes: number; remindYes7d: number; remindNo: number; remindCancelled: number; ctaBySource: Record<string, number>
}
type SaveResult = { ok: true; config?: GoalsConfig } | { ok: false; status: number; error: string }

const FEATURE_LABEL: Record<FeatureKey, { name: string; desc: string }> = {
  daily:   { name: 'Progres Harian',  desc: 'Ring progres, makro, per waktu makan' },
  weekly:  { name: 'Progres Mingguan', desc: 'Grafik 7 hari, rata-rata, hari sesuai target' },
  monthly: { name: 'Progres Bulanan', desc: 'Kalender asupan, total vs target bulanan' },
  macro:   { name: 'Target makro',      desc: 'Tab Makro di sheet Atur target: protein, karbo, lemak' },
  recs:    { name: 'Rekomendasi bacaan & resep', desc: 'Paling bawah tab Mingguan & Bulanan · konten belum siap' },
}

async function postConfig(patch: Partial<GoalsConfig>, adminPassword: string): Promise<SaveResult> {
  try {
    const r = await fetch('/api/admin/goals?action=update_config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patch, adminPassword }),
    })
    const d = await r.json().catch(() => ({}))
    return r.ok ? { ok: true, config: d.config } : { ok: false, status: r.status, error: d.error ?? 'Terjadi kesalahan' }
  } catch { return { ok: false, status: 0, error: 'Gagal menghubungi server' } }
}

const SOURCE_LABEL: Record<string, string> = { weekly: 'Tab Mingguan (terkunci)', monthly: 'Tab Bulanan (terkunci)', goal_macro: 'Target makro (terkunci)' }

export default function GoalsPage() {
  const [saved, setSaved] = useState<GoalsConfig | null>(null)
  const [cfg, setCfg] = useState<GoalsConfig | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [presetsText, setPresetsText] = useState('')
  const [lang, setLang] = useState<'id' | 'en'>('id')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [confirming, setConfirming] = useState(false)

  function load(d: { config: GoalsConfig; stats?: Stats }) {
    setSaved(d.config); setCfg(structuredClone(d.config)); setPresetsText(d.config.target.presets.join(', '))
    if (d.stats) setStats(d.stats)
  }
  useEffect(() => {
    fetch('/api/admin/goals?action=overview').then(r => r.json()).then(load).catch(() => toast.error('Gagal memuat data'))
  }, [])

  const parsedPresets = useMemo(() => presetsText.split(',').map(s => s.trim()).filter(Boolean).map(Number), [presetsText])
  const presetsValid = parsedPresets.length > 0 && parsedPresets.every(n => Number.isInteger(n))

  if (!cfg || !saved) {
    return (
      <AdminPage title="Goals & Tracker" breadcrumb={[{ label: 'Goals & Tracker' }]}>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 flex flex-col gap-5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-[220px] rounded-md" />)}</div>
          <div className="xl:col-span-4 flex flex-col gap-5">{[0, 1].map(i => <Skeleton key={i} className="h-[260px] rounded-md" />)}</div>
        </div>
      </AdminPage>
    )
  }

  const set = (fn: (c: GoalsConfig) => void) => setCfg(prev => { const n = structuredClone(prev!); fn(n); return n })

  function save(patch: Partial<GoalsConfig>, title: string, extraError?: string | null) {
    if (extraError) { toast.error(extraError); return }
    setConfirm({
      title, message: 'Perubahan langsung berlaku di app tanpa rilis ulang.', confirmLabel: 'Simpan', severity: 'green',
      onConfirm: async (pwd: string) => {
        setConfirming(true)
        const res = await postConfig(patch, pwd)
        setConfirming(false)
        if (res.ok) { toast.success('Berhasil'); setConfirm(null); if (res.config) load({ config: res.config }) }
        else { toast.error(res.error); if (res.status !== 401) setConfirm(null) }
      },
    })
  }
  const footer = (onClick: () => void, disabled?: boolean) => (
    <div className="flex justify-end"><Button icon={Lock} className="max-lg:w-full" onClick={onClick} disabled={disabled}>Simpan</Button></div>
  )

  const macroTotal = cfg.macroDefault.proteinPct + cfg.macroDefault.carbsPct + cfg.macroDefault.fatPct
  const grams = macroGramsFromKcal(2000, cfg.macroDefault)
  const targetDraft: GoalsConfig['target'] = { ...cfg.target, presets: presetsValid ? parsedPresets : cfg.target.presets }
  const targetError = !presetsValid ? 'Pilihan cepat harus berupa angka dipisah koma'
    : validateGoalsConfig({ ...cfg, target: targetDraft })
  const bySrc = stats?.ctaBySource ?? {}
  const maxSrc = Math.max(1, ...Object.values(bySrc))
  const pctRemind = stats && stats.remindYes + stats.remindNo > 0 ? Math.round(stats.remindYes / (stats.remindYes + stats.remindNo) * 100) : 0

  const free = FEATURE_KEYS.filter(k => cfg.features[k].on && !cfg.features[k].premium)
  const locked = FEATURE_KEYS.filter(k => cfg.features[k].on && cfg.features[k].premium)
  const hidden = FEATURE_KEYS.filter(k => !cfg.features[k].on)
  const list = (ks: FeatureKey[]) => ks.map(k => FEATURE_LABEL[k].name.replace('Rekomendasi ', 'Rekomendasi ')).join(', ')

  return (
    <AdminPage
      title="Goals & Tracker"
      breadcrumb={[{ label: 'Goals & Tracker' }]}
      actions={<Badge variant={saved.enabled ? 'soft' : 'light'}>{saved.enabled ? 'Fitur aktif' : 'Fitur nonaktif'}</Badge>}
    >
      <Alert variant="light" icon={Shield}>Setiap perubahan di halaman ini wajib dikonfirmasi dengan password admin.</Alert>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        <div className="xl:col-span-8 flex flex-col gap-5 max-lg:gap-4 min-w-0">
          {/* 1. Status fitur */}
          <Card outline="brand" icon={Power} title="Status Fitur"
            footer={footer(() => save({ enabled: cfg.enabled, allowEdit: cfg.allowEdit }, 'Simpan status fitur?'))}>
            <div className="flex flex-col gap-4">
              <Switch checked={cfg.enabled} onChange={v => set(c => { c.enabled = v })}
                label="Goals & Tracker aktif"
                description="Kalau dimatikan, tab Progres tetap ada di bottom nav tetapi halamannya menampilkan “Progres belum tersedia” untuk semua user. Berlaku tanpa rilis ulang app." />
              <Switch checked={cfg.allowEdit} onChange={v => set(c => { c.allowEdit = v })}
                label="User boleh mengubah target sendiri"
                description="Kalau dimatikan, semua user memakai target default." />
            </div>
          </Card>

          {/* 2. Akses per paket */}
          <Card outline="brand" icon={Lock} title="Akses Fitur per Paket"
            subtitle="Fitur Premium tampil terkunci (gembok + tombol Aktifkan Premium) untuk user gratis."
            footer={footer(() => save({ features: cfg.features }, 'Simpan akses fitur?'))}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[460px]">
                <thead>
                  <tr className="text-sm text-secondary text-left">
                    <th className="py-2 font-medium">Fitur</th><th className="py-2 font-medium text-center">Tampil</th><th className="py-2 font-medium">Akses</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_KEYS.map(k => (
                    <tr key={k} className="border-t border-border">
                      <td className="py-2.5 pr-3">
                        <p className="text-base font-semibold text-primary">{FEATURE_LABEL[k].name}</p>
                        <p className="text-sm text-secondary">{FEATURE_LABEL[k].desc}</p>
                      </td>
                      <td className="py-2.5 text-center">
                        <Switch className="justify-center" ariaLabel={`Tampilkan ${FEATURE_LABEL[k].name}`} checked={cfg.features[k].on}
                          onChange={v => set(c => { c.features[k].on = v })} />
                      </td>
                      <td className="py-2.5">
                        <SegmentedControl size="sm" mobileGrid={false} ariaLabel={`Akses ${FEATURE_LABEL[k].name}`}
                          value={cfg.features[k].premium ? 'premium' : 'free'}
                          onChange={v => set(c => { c.features[k].premium = v === 'premium' })}
                          options={[{ value: 'free', label: 'Gratis' }, { value: 'premium', label: 'Premium' }]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 3. Target harian */}
          <Card outline="brand" icon={Target} title="Target Harian"
            footer={footer(() => save({ target: targetDraft, macroDefault: cfg.macroDefault }, 'Simpan target harian?', targetError ?? (macroTotal !== 100 ? validateGoalsConfig(cfg) : null)))}>
            <div className="flex flex-col gap-4">
              <p className="text-base font-semibold text-primary">Kalori <Badge variant="soft" size="sm" className="ml-1">Gratis</Badge></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Default (kkal)" htmlFor="g-def"><Input id="g-def" type="number" inputMode="numeric" value={cfg.target.defaultKcal} onChange={e => set(c => { c.target.defaultKcal = Number(e.target.value) })} /></FormField>
                <FormField label="Minimum (kkal)" htmlFor="g-min"><Input id="g-min" type="number" inputMode="numeric" value={cfg.target.minKcal} onChange={e => set(c => { c.target.minKcal = Number(e.target.value) })} /></FormField>
                <FormField label="Maksimum (kkal)" htmlFor="g-max"><Input id="g-max" type="number" inputMode="numeric" value={cfg.target.maxKcal} onChange={e => set(c => { c.target.maxKcal = Number(e.target.value) })} /></FormField>
                <FormField label='Toleransi "sesuai target"' htmlFor="g-tol">
                  <Select id="g-tol" value={cfg.target.tolerancePct} onChange={e => set(c => { c.target.tolerancePct = Number(e.target.value) })}>
                    {[5, 10, 15].map(n => <option key={n} value={n}>± {n}%</option>)}
                  </Select>
                </FormField>
              </div>
              <FormField label="Pilihan cepat di app" htmlFor="g-presets"
                help="Pisahkan dengan koma. Target mingguan = harian × 7, bulanan = harian × jumlah hari di bulan itu. Target berat badan sengaja tidak disediakan."
                error={!presetsValid ? 'Isi angka dipisah koma' : undefined}>
                <Input id="g-presets" value={presetsText} onChange={e => setPresetsText(e.target.value)} invalid={!presetsValid} />
              </FormField>

              <div className="border-t border-border pt-4 flex flex-col gap-4">
                <div>
                  <p className="text-base font-semibold text-primary">Makro default <Badge variant="soft" size="sm" className="ml-1">Premium</Badge></p>
                  <p className="text-sm text-secondary mt-0.5">Titik awal tab Makro, juga dipakai user yang belum mengatur makro sendiri.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Protein (% kalori)" htmlFor="g-p" help={`≈ ${grams.protein} g untuk 2.000 kkal`}>
                    <Input id="g-p" type="number" inputMode="numeric" value={cfg.macroDefault.proteinPct} onChange={e => set(c => { c.macroDefault.proteinPct = Number(e.target.value) })} />
                  </FormField>
                  <FormField label="Karbo (% kalori)" htmlFor="g-c" help={`≈ ${grams.carbs} g untuk 2.000 kkal`}>
                    <Input id="g-c" type="number" inputMode="numeric" value={cfg.macroDefault.carbsPct} onChange={e => set(c => { c.macroDefault.carbsPct = Number(e.target.value) })} />
                  </FormField>
                  <FormField label="Lemak (% kalori)" htmlFor="g-f" help={`≈ ${grams.fat} g untuk 2.000 kkal`}>
                    <Input id="g-f" type="number" inputMode="numeric" value={cfg.macroDefault.fatPct} onChange={e => set(c => { c.macroDefault.fatPct = Number(e.target.value) })} />
                  </FormField>
                  <FormField label="Toleransi total makro vs kalori" htmlFor="g-mt" help='Di luar ini, app menampilkan tombol "Samakan".'>
                    <Select id="g-mt" value={cfg.macroDefault.tolerancePct} onChange={e => set(c => { c.macroDefault.tolerancePct = Number(e.target.value) })}>
                      {[0, 5, 10].map(n => <option key={n} value={n}>± {n}%</option>)}
                    </Select>
                  </FormField>
                </div>
                {macroTotal === 100
                  ? <Alert variant="info" icon={Check}>Total pembagian 100%. Gram dihitung dari target kalori tiap user (protein &amp; karbo 4 kkal/g, lemak 9 kkal/g).</Alert>
                  : <Alert variant="danger">Total pembagian {macroTotal}%, harus tepat 100% sebelum disimpan.</Alert>}
              </div>
            </div>
          </Card>

          {/* 4. Pembelian Premium */}
          <Card outline="brand" icon={Sparkles} title="Pembelian Premium"
            subtitle='Rencana: dibundel dengan Request Limit. Selama "Segera hadir", tombol Aktifkan di app membuka info + "Ingatkan saya".'
            footer={footer(() => save({ premiumSale: cfg.premiumSale }, 'Simpan teks Premium?'))}>
            <div className="flex flex-col gap-4">
              <div role="radiogroup" aria-label="Mode pembelian" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div role="radio" aria-checked className="rounded-md border-2 border-brand bg-green-50 px-3 py-2.5">
                  <p className="text-base font-semibold text-primary">Segera hadir</p>
                  <p className="text-sm text-secondary">CTA tampil, pembelian belum dibuka</p>
                </div>
                <div role="radio" aria-checked={false} aria-disabled className="rounded-md border border-border px-3 py-2.5 opacity-60 cursor-not-allowed">
                  <p className="text-base font-semibold text-primary">Aktif, dibundel dengan Limit</p>
                  <p className="text-sm text-secondary">Butuh paket di menu Request Limit</p>
                </div>
              </div>
              <FormField label="Bahasa konten">
                <SegmentedControl size="sm" mobileGrid={false} value={lang} onChange={setLang}
                  options={[{ value: 'id', label: 'Indonesia' }, { value: 'en', label: 'English' }]} />
              </FormField>
              <FormField label="Judul sheet Premium" htmlFor="g-pt">
                <Input id="g-pt" value={cfg.premiumSale.copy[lang].title} onChange={e => set(c => { c.premiumSale.copy[lang].title = e.target.value })} />
              </FormField>
              <FormField label="Deskripsi" htmlFor="g-pb">
                <Textarea id="g-pb" rows={3} value={cfg.premiumSale.copy[lang].body} onChange={e => set(c => { c.premiumSale.copy[lang].body = e.target.value })} />
              </FormField>
            </div>
          </Card>

          {/* 5. Modul berikutnya */}
          <Card outline="brand" icon={BookOpen} title="Modul Premium Berikutnya"
            subtitle='Slot "Bacaan & resep untukmu" di paling bawah tab Mingguan dan Bulanan. Tampil dan akses diatur di Akses Fitur per Paket.'
            footer={footer(() => save({ recCountPerTab: cfg.recCountPerTab }, 'Simpan jumlah kartu?'))}>
            <div className="flex flex-col gap-3">
              {[['Resep makanan sehat', 'Dibuka dari kartu Resep sehat'], ['Bacaan & tips pola makan', 'Artikel dwibahasa, dikelola via CMS']].map(([t, s]) => (
                <div key={t} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5">
                  <div><p className="text-base font-semibold text-primary">{t}</p><p className="text-sm text-secondary">{s}</p></div>
                  <Badge variant="honeysoft">Belum tersedia</Badge>
                </div>
              ))}
              <FormField label="Jumlah kartu rekomendasi per tab" htmlFor="g-rc">
                <Select id="g-rc" className="max-w-[200px]" value={cfg.recCountPerTab} onChange={e => set(c => { c.recCountPerTab = Number(e.target.value) })}>
                  {[2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              </FormField>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-5 max-lg:gap-4 min-w-0">
          <Card icon={Activity} title="Ringkasan">
            {!stats ? <Skeleton className="h-[200px]" /> : (
              <>
                <KeyValue dense items={[
                  { label: 'User sudah set target', value: fmtNum(stats.usersWithGoal) },
                  { label: 'Klik CTA Premium (7 hari)', value: fmtNum(stats.ctaClicks7d) },
                  { label: 'Tap tab Makro terkunci (7 hari)', value: fmtNum(stats.macroLocked7d) },
                  { label: 'Daftar "Ingatkan saya"', value: fmtNum(stats.remindYes) },
                  { label: 'Pilih "Kembali" (tanpa diingatkan)', value: fmtNum(stats.remindNo) },
                  { label: 'Premium aktif', value: fmtNum(stats.premiumActive) },
                ]} />
                <Button variant="outline" icon={Users} fullWidth className="mt-3" href="/admin/users">Buka Manajemen User</Button>
              </>
            )}
          </Card>

          <Card icon={Bell} title="Waitlist Premium">
            {!stats ? <Skeleton className="h-[220px]" /> : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-secondary">User yang menekan &quot;Ingatkan saya&quot; di sheet Premium, dibandingkan dengan yang memilih &quot;Kembali&quot;.</p>
                <p className="text-primary"><span className="text-3xl font-bold tabular-nums text-brand">{fmtNum(stats.remindYes)}</span> <span className="text-base">user · +{fmtNum(stats.remindYes7d)} dalam 7 hari</span></p>
                <p className="text-sm text-secondary">vs {fmtNum(stats.remindNo)} user pilih &quot;Kembali&quot; · {pctRemind}% memilih diingatkan</p>
                <div>
                  <p className="text-sm font-semibold text-primary mb-1.5">Dari mana mereka klik</p>
                  <div className="flex flex-col gap-2">
                    {Object.keys(SOURCE_LABEL).map(s => (
                      <div key={s}>
                        <div className="flex justify-between text-sm"><span>{SOURCE_LABEL[s]}</span><span className="tabular-nums font-semibold">{fmtNum(bySrc[s] ?? 0)}</span></div>
                        <Progress value={((bySrc[s] ?? 0) / maxSrc) * 100} label={SOURCE_LABEL[s]} />
                      </div>
                    ))}
                  </div>
                </div>
                <KeyValue dense items={[{ label: 'Membatalkan pengingat', value: fmtNum(stats.remindCancelled) }]} />
                <a href="/api/admin/goals?action=export_waitlist" download className={buttonClass('outline', 'md', 'w-full')}><Download size={16} aria-hidden />Export CSV</a>
              </div>
            )}
          </Card>

          <Card icon={Sparkles} title="Efek di Aplikasi">
            {!saved.enabled || !cfg.enabled ? (
              <p className="text-base text-primary">Halaman Progres di app menampilkan "belum tersedia".</p>
            ) : (
              <ul className="flex flex-col gap-2.5 list-none m-0 p-0 text-base text-primary">
                {free.length > 0 && <li className="flex gap-2"><span className="mt-2 size-2 rounded-full bg-brand shrink-0" />Gratis untuk semua: {list(free)}</li>}
                {locked.length > 0 && <li className="flex gap-2"><span className="mt-2 size-2 rounded-full bg-honey-500 shrink-0" />Terkunci + CTA &quot;Aktifkan Premium&quot;: {list(locked)}</li>}
                {hidden.length > 0 && <li className="flex gap-2"><span className="mt-2 size-2 rounded-full bg-sand-300 shrink-0" />Disembunyikan: {list(hidden)}</li>}
                <li className="flex gap-2"><span className="mt-2 size-2 rounded-full bg-brand shrink-0" />{cfg.allowEdit ? 'Semua user bisa ubah target kalori; makro ikut akses "Target makro".' : 'Semua user memakai target default.'}</li>
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ConfirmPasswordModal request={confirm} loading={confirming} onCancel={() => setConfirm(null)} />
    </AdminPage>
  )
}
