'use client'
import { LandingIcon } from '@/components/landing/sections/icons'
import { LIMITS } from '@/lib/landing/publish-rules'
import { newId, type HowItWorks, type Step } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, ItemCard, ListHeader, RemoveButton, TextField, ToggleCard, useOpenItem } from '../fields'
import IconPicker from '../IconPicker'
import SortableList, { DragHandle } from '../SortableList'

export default function HowItWorksForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const x = c.howItWorks
  const set = (patch: Partial<HowItWorks>) => update('howItWorks', { ...x, ...patch })
  const setItem = (id: string, patch: Partial<Step>) => set({ items: x.items.map(i => (i.id === id ? { ...i, ...patch } : i)) })
  const { open, toggle, setOpen } = useOpenItem(x.items[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Label kecil" value={x.eyebrow} onChange={v => set({ eyebrow: v })} max={LIMITS.eyebrow} />
        <TextField label="Judul" required value={x.title} onChange={v => set({ title: v })} max={LIMITS.sectionTitle} />
      </div>
      <TextField label="Deskripsi" value={x.subtitle} onChange={v => set({ subtitle: v })} max={LIMITS.sectionSubtitle} />
      <ToggleCard checked={x.showNumbers} onChange={v => set({ showNumbers: v })} label="Tampilkan nomor langkah (01, 02, 03)" />

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Langkah" count={x.items.length} max={LIMITS.steps}
          action={(
            <AddButton disabled={x.items.length >= LIMITS.steps} onClick={() => {
              const s: Step = { id: newId('step'), icon: 'sparkle', title: '', description: '' }
              set({ items: [...x.items, s] })
              setOpen(s.id)
            }}>Tambah langkah</AddButton>
          )}
        />
        <SortableList
          items={x.items}
          getId={i => i.id}
          onReorder={items => set({ items })}
          className="flex flex-col gap-2.5"
          renderItem={(s, handle, i) => {
            const n = String(i + 1).padStart(2, '0')
            const isOpen = open === s.id
            return (
              <ItemCard
                open={isOpen}
                onToggle={() => toggle(s.id)}
                handle={<DragHandle label={`Urutkan langkah ${n}`} {...handle} />}
                title={isOpen ? `Langkah ${n}` : <span className="inline-flex items-center gap-2"><span className="w-7 h-7 rounded-sm bg-green-50 text-green-700 inline-flex items-center justify-center"><LandingIcon name={s.icon} size={16} /></span>{n} · {s.title || 'Tanpa judul'}</span>}
                subtitle={isOpen ? undefined : s.description}
              >
                <IconPicker value={s.icon} onChange={icon => setItem(s.id, { icon })} />
                <TextField label="Judul langkah" required value={s.title} onChange={v => setItem(s.id, { title: v })} max={LIMITS.stepTitle} />
                <TextField label="Deskripsi" multiline rows={3} value={s.description} onChange={v => setItem(s.id, { description: v })} max={LIMITS.stepDescription} />
                <div className="flex justify-end"><RemoveButton label={`Hapus langkah ${n}`} onClick={() => set({ items: x.items.filter(i => i.id !== s.id) })} /></div>
              </ItemCard>
            )
          }}
        />
      </div>
    </div>
  )
}
