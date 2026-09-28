'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Input, SegmentedControl } from '@/components/admin/ui'
import { LIMITS } from '@/lib/landing/publish-rules'
import type { Hero, SectionKey } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, Group, LinkField, TextField, ToggleCard } from '../fields'
import ImageUploader from '../ImageUploader'

export default function HeroForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const x = c.hero
  const set = (patch: Partial<Hero>) => update('hero', { ...x, ...patch })
  const [newBenefit, setNewBenefit] = useState('')
  const [adding, setAdding] = useState(false)
  const hidden = (k: SectionKey) => !c.visibility[k]

  function addBenefit() {
    const v = newBenefit.trim()
    if (!v || x.benefits.length >= LIMITS.benefits) return
    set({ benefits: [...x.benefits, v] })
    setNewBenefit('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <TextField label="Label kecil" value={x.eyebrow} onChange={v => set({ eyebrow: v })} max={LIMITS.eyebrow} />
      <TextField
        label="Judul" required multiline rows={2}
        value={x.title} onChange={v => set({ title: v })} max={LIMITS.heroTitle}
        help="Tekan Enter untuk baris kedua — baris kedua otomatis berwarna hijau."
      />
      <TextField label="Deskripsi" multiline rows={3} value={x.subtitle} onChange={v => set({ subtitle: v })} max={LIMITS.heroSubtitle} />

      <Group title="Tombol">
        <LinkField label="Tombol utama" value={x.primary} onChange={primary => set({ primary })} sectionHidden={hidden} />
        <LinkField
          label="Tombol kedua" optional
          value={x.secondary ?? { label: '', target: { kind: 'section', section: 'howItWorks' } }}
          onChange={l => set({ secondary: l.label === '' ? null : l })}
          sectionHidden={hidden}
          placeholder="Kosongkan untuk menyembunyikan"
        />
        <p className="text-sm text-secondary leading-normal">“Otomatis” = pengunjung ke {c.settings.ctaUrlGuest || '/login'}, user yang sudah login ke {c.settings.ctaUrlAuth || '/main/riwayat'} (diatur di Pengaturan global). Kosongkan label tombol kedua untuk menyembunyikannya.</p>
      </Group>

      <div>
        <p className="text-base font-semibold text-primary mb-2">Poin keunggulan <span className="font-normal text-secondary">(maks. {LIMITS.benefits})</span></p>
        <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
          {x.benefits.map((b, i) => (
            <li key={`${b}-${i}`} className="inline-flex items-center gap-1 pl-3 pr-1 min-h-9 rounded-sm bg-sunken border border-border text-base text-primary">
              <span className={b.length > LIMITS.benefit ? 'text-rose-600' : undefined}>{b}</span>
              <button type="button" aria-label={`Hapus poin ${b}`} onClick={() => set({ benefits: x.benefits.filter((_, j) => j !== i) })} className="w-8 h-8 inline-flex items-center justify-center rounded-sm text-secondary hover:bg-muted hover:text-primary">
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
          <li>
            {adding ? (
              <span className="inline-flex gap-2">
                <Input
                  autoFocus aria-label="Poin keunggulan baru" value={newBenefit} maxLength={LIMITS.benefit}
                  onChange={e => setNewBenefit(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBenefit() } if (e.key === 'Escape') setAdding(false) }}
                  onBlur={() => { if (!newBenefit.trim()) setAdding(false) }}
                  className="w-52"
                  placeholder={`Maks. ${LIMITS.benefit} karakter`}
                />
              </span>
            ) : (
              <AddButton disabled={x.benefits.length >= LIMITS.benefits} onClick={() => setAdding(true)}>Tambah poin</AddButton>
            )}
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-base font-semibold text-primary">Visual hero</p>
        <SegmentedControl
          ariaLabel="Visual hero"
          value={x.visual.kind === 'image' ? 'image' : 'mockup'}
          onChange={v => set({ visual: v === 'image' ? { kind: 'image', imageUrl: x.visual.imageUrl } : { kind: 'analysis', imageUrl: x.visual.imageUrl } })}
          options={[{ value: 'mockup', label: 'Mockup bawaan' }, { value: 'image', label: 'Gambar kustom' }]}
          mobileGrid={false}
        />
        {x.visual.kind === 'image' ? (
          <ImageUploader
            value={x.visual.imageUrl}
            onChange={url => set({ visual: { kind: 'image', imageUrl: url } })}
            folder="landing/hero"
            previewClass="w-20 h-40"
            hint="PNG/WebP, rasio 1:2 (mis. 640×1280), maks 2 MB — tampil di dalam bingkai HP."
          />
        ) : (
          <p className="text-sm text-secondary">Mockup layar “Hasil Analisa” bawaan (angka ilustratif).</p>
        )}
      </div>

      <ToggleCard
        checked={x.showStoreBadges}
        onChange={v => set({ showStoreBadges: v })}
        label="Tampilkan badge download"
        description="App Store, Google Play, Telegram — tautannya di Pengaturan global. Badge tanpa tautan tidak tampil."
      />
    </div>
  )
}
