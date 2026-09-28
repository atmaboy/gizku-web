'use client'
import { ArrowDownUp } from 'lucide-react'
import { Button, Select } from '@/components/admin/ui'
import { LandingIcon } from '@/components/landing/sections/icons'
import { LIMITS } from '@/lib/landing/publish-rules'
import { newId, type Feature, type FeatureRow, type Features } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, ItemCard, RemoveButton, TextField, useOpenItem } from '../fields'
import IconPicker from '../IconPicker'
import ImageUploader from '../ImageUploader'
import SortableList, { DragHandle } from '../SortableList'

const VISUAL_OPTIONS: { value: FeatureRow['visual']['kind']; label: string }[] = [
  { value: 'history', label: 'Mockup: layar Riwayat' },
  { value: 'analysis', label: 'Mockup: hasil analisa' },
  { value: 'telegram', label: 'Mockup: chat Telegram' },
  { value: 'image', label: 'Gambar kustom' },
]

export default function FeaturesForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const x = c.features
  const set = (patch: Partial<Features>) => update('features', { ...x, ...patch })
  const setRow = (r: 0 | 1, row: FeatureRow) => set({ rows: (r === 0 ? [row, x.rows[1]] : [x.rows[0], row]) as Features['rows'] })
  const setItem = (r: 0 | 1, id: string, patch: Partial<Feature>) => setRow(r, { ...x.rows[r], items: x.rows[r].items.map(i => (i.id === id ? { ...i, ...patch } : i)) })
  const move = (from: 0 | 1, id: string) => {
    const to = (from === 0 ? 1 : 0) as 0 | 1
    const item = x.rows[from].items.find(i => i.id === id)
    if (!item) return
    const rows = [...x.rows] as Features['rows']
    rows[from] = { ...rows[from], items: rows[from].items.filter(i => i.id !== id) }
    rows[to] = { ...rows[to], items: [...rows[to].items, item] }
    set({ rows })
  }
  const { open, toggle, setOpen } = useOpenItem(null)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Label kecil" value={x.eyebrow} onChange={v => set({ eyebrow: v })} max={LIMITS.eyebrow} />
        <TextField label="Judul" required value={x.title} onChange={v => set({ title: v })} max={LIMITS.sectionTitle} />
      </div>
      <TextField label="Deskripsi" value={x.subtitle} onChange={v => set({ subtitle: v })} max={LIMITS.sectionSubtitle} />

      {([0, 1] as const).map(r => {
        const row = x.rows[r]
        const full = row.items.length >= LIMITS.featuresPerRow
        const otherFull = x.rows[r === 0 ? 1 : 0].items.length >= LIMITS.featuresPerRow
        return (
          <section key={r} aria-label={`Baris ${r + 1}`} className="rounded-md bg-sunken p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-md font-semibold text-primary">Baris {r + 1} · visual di {r === 0 ? 'kiri' : 'kanan'}</h3>
              <Select
                aria-label={`Visual baris ${r + 1}`}
                className="!w-auto"
                value={row.visual.kind}
                onChange={e => setRow(r, { ...row, visual: { kind: e.target.value as FeatureRow['visual']['kind'], imageUrl: row.visual.imageUrl } })}
              >
                {VISUAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            {row.visual.kind === 'image' && (
              <ImageUploader
                value={row.visual.imageUrl}
                onChange={url => setRow(r, { ...row, visual: { kind: 'image', imageUrl: url } })}
                folder="landing/features"
                previewClass="w-20 h-20"
                hint="PNG/JPEG/WebP persegi, maks 2 MB."
                compact
              />
            )}
            <SortableList
              items={row.items}
              getId={i => i.id}
              onReorder={items => setRow(r, { ...row, items })}
              className="flex flex-col gap-2"
              renderItem={(f, handle) => {
                const isOpen = open === f.id
                return (
                  <ItemCard
                    open={isOpen}
                    onToggle={() => toggle(f.id)}
                    handle={<DragHandle label={`Urutkan fitur ${f.title}`} {...handle} />}
                    title={<span className="inline-flex items-center gap-2"><span className="w-7 h-7 rounded-sm bg-green-50 text-green-700 inline-flex items-center justify-center shrink-0"><LandingIcon name={f.icon} size={16} /></span><span className="truncate">{f.title || 'Tanpa judul'}</span></span>}
                  >
                    <IconPicker value={f.icon} onChange={icon => setItem(r, f.id, { icon })} />
                    <TextField label="Judul" required value={f.title} onChange={v => setItem(r, f.id, { title: v })} max={LIMITS.featureTitle} />
                    <TextField label="Deskripsi" multiline rows={2} value={f.description} onChange={v => setItem(r, f.id, { description: v })} max={LIMITS.featureDescription} />
                    <div className="flex items-center justify-between gap-2">
                      <Button variant="outline" size="sm" icon={ArrowDownUp} disabled={otherFull} onClick={() => move(r, f.id)}>
                        Pindah ke baris {r === 0 ? 2 : 1}
                      </Button>
                      <RemoveButton label={`Hapus fitur ${f.title}`} onClick={() => setRow(r, { ...row, items: row.items.filter(i => i.id !== f.id) })} />
                    </div>
                  </ItemCard>
                )
              }}
            />
            <AddButton block disabled={full} onClick={() => {
              const f: Feature = { id: newId('feat'), icon: 'sparkle', title: '', description: '' }
              setRow(r, { ...row, items: [...row.items, f] })
              setOpen(f.id)
            }}>Tambah fitur ke baris {r + 1} (maks. {LIMITS.featuresPerRow})</AddButton>
          </section>
        )
      })}
      <p className="text-sm text-secondary leading-normal">Baris tanpa fitur disembunyikan. Kartu fitur tidak memakai tombol “Pelajari lebih lanjut”.</p>
    </div>
  )
}
