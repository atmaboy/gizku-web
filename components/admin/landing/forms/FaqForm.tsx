'use client'
import { Input, SegmentedControl } from '@/components/admin/ui'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { htmlTextLength } from '@/lib/landing/format'
import { LIMITS } from '@/lib/landing/publish-rules'
import { newId, type Faq, type FaqItem } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, CharCounter, ItemCard, LinkField, ListHeader, RemoveButton, StatusPill, TextField, useOpenItem } from '../fields'
import SortableList, { DragHandle } from '../SortableList'

export default function FaqForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const x = c.faq
  const set = (patch: Partial<Faq>) => update('faq', { ...x, ...patch })
  const setItem = (id: string, patch: Partial<FaqItem>) => set({ items: x.items.map(i => (i.id === id ? { ...i, ...patch } : i)) })
  const { open, toggle, setOpen } = useOpenItem(x.items[0]?.id ?? null)
  const draftCount = x.items.filter(i => i.status === 'draft').length

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Label kecil" value={x.eyebrow} onChange={v => set({ eyebrow: v })} max={LIMITS.eyebrow} />
        <TextField label="Judul" required value={x.title} onChange={v => set({ title: v })} max={LIMITS.sectionTitle} />
      </div>
      <TextField label="Deskripsi" value={x.subtitle} onChange={v => set({ subtitle: v })} max={LIMITS.sectionSubtitle} />
      <LinkField label="Tombol kontak" value={x.contact} onChange={contact => set({ contact })} allowAuto={false} sectionHidden={k => !c.visibility[k]} placeholder="Hubungi Kami" />

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Pertanyaan" count={x.items.length}
          action={<AddButton onClick={() => {
            const it: FaqItem = { id: newId('faq'), question: '', answerHtml: '', openDefault: false, status: 'draft' }
            set({ items: [...x.items, it] })
            setOpen(it.id)
          }}>Tambah pertanyaan</AddButton>}
        />
        <SortableList
          items={x.items}
          getId={i => i.id}
          onReorder={items => set({ items })}
          className="flex flex-col gap-2.5"
          renderItem={(it, handle, i) => {
            const isOpen = open === it.id
            const len = htmlTextLength(it.answerHtml)
            return (
              <ItemCard
                open={isOpen}
                onToggle={() => toggle(it.id)}
                handle={<DragHandle label={`Urutkan pertanyaan ${i + 1}`} {...handle} />}
                title={isOpen ? `Pertanyaan ${i + 1}` : (it.question || 'Pertanyaan baru')}
                trailing={<StatusPill status={it.status} />}
              >
                <div>
                  <label htmlFor={`q-${it.id}`} className="sr-only">Pertanyaan</label>
                  <Input id={`q-${it.id}`} value={it.question} placeholder="Tulis pertanyaan" className="font-semibold" invalid={it.question.length > LIMITS.question} onChange={e => setItem(it.id, { question: e.target.value })} />
                </div>
                <RichTextEditor
                  compact
                  value={it.answerHtml}
                  resetKey={it.id}
                  onChange={html => setItem(it.id, { answerHtml: html })}
                  placeholder="Tulis jawaban…"
                  ariaLabel={`Jawaban untuk ${it.question || 'pertanyaan'}`}
                  aside={<CharCounter n={len} max={LIMITS.answer} />}
                />
                <label className="flex items-center gap-2.5 text-base text-primary cursor-pointer min-h-11">
                  <input type="checkbox" className="w-4 h-4 accent-[var(--green-600)]" checked={it.openDefault} onChange={e => setItem(it.id, { openDefault: e.target.checked })} />
                  Terbuka saat halaman dimuat
                </label>
                <div className="flex items-center justify-between gap-3">
                  <SegmentedControl
                    ariaLabel="Status pertanyaan" size="sm" mobileGrid={false}
                    value={it.status}
                    onChange={status => setItem(it.id, { status })}
                    options={[{ value: 'live', label: 'Tayang' }, { value: 'draft', label: 'Draf' }]}
                  />
                  <RemoveButton label={`Hapus pertanyaan ${i + 1}`} onClick={() => set({ items: x.items.filter(q => q.id !== it.id) })} />
                </div>
              </ItemCard>
            )
          }}
        />
        <p className="text-sm text-secondary leading-normal">
          Pertanyaan berstatus Tayang juga dikirim sebagai structured data FAQPage, jadi bisa muncul di hasil pencarian Google.
          {draftCount > 0 && <> {draftCount} pertanyaan berstatus Draf tidak ditampilkan.</>}
        </p>
      </div>
    </div>
  )
}
