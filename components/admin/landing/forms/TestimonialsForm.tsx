'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Star, X } from 'lucide-react'
import { Alert, Button, SegmentedControl, useDialogBehavior } from '@/components/admin/ui'
import { initialOf } from '@/lib/landing/format'
import { LIMITS } from '@/lib/landing/publish-rules'
import { newId, type Testimonial, type Testimonials } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { useBuilder, useDraft } from '../BuilderContext'
import { ListHeader, StatusPill, TextField, ToggleCard } from '../fields'
import ImageUploader from '../ImageUploader'
import SortableList, { DragHandle } from '../SortableList'

function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          onClick={() => onChange(n)}
          className="w-11 h-11 inline-flex items-center justify-center rounded-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <Star size={26} aria-hidden className={n <= value ? 'fill-honey-500 text-honey-500' : 'text-sand-300'} />
        </button>
      ))}
    </div>
  )
}

function TestimonialDrawer({ item, isNew, onSave, onDelete, onClose }: {
  item: Testimonial
  isNew: boolean
  onSave: (t: Testimonial) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [t, setT] = useState(item)
  const [tried, setTried] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogBehavior(true, onClose, panel)
  useEffect(() => setT(item), [item])

  const errors = {
    name: !t.name.trim() ? 'Nama wajib diisi' : t.name.length > LIMITS.testimonialName ? `Maksimal ${LIMITS.testimonialName} karakter` : null,
    quote: !t.quote.trim() ? 'Kutipan wajib diisi' : t.quote.length > LIMITS.quote ? `Maksimal ${LIMITS.quote} karakter` : null,
    consent: t.status === 'live' && !t.consentAt ? 'Centang izin pengguna untuk status Tayang.' : null,
  }
  const invalid = Object.values(errors).some(Boolean)

  function save() {
    setTried(true)
    if (invalid) return
    onSave({ ...t, name: t.name.trim(), city: t.city.trim(), quote: t.quote.trim() })
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-bark-900/45 animate-[fadeIn_150ms_ease-out]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute right-0 top-[var(--staging-banner-h,0px)] bottom-0 w-full sm:w-[440px] bg-surface shadow-[0_12px_40px_rgba(36,30,25,0.25)] flex flex-col focus:outline-none"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <h2 id={titleId} className="text-lg font-semibold text-primary flex-1">{isNew ? 'Tambah testimoni' : 'Edit testimoni'}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-10 h-10 inline-flex items-center justify-center rounded-sm text-secondary hover:bg-muted"><X size={20} aria-hidden /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            {t.avatarUrl ? null : (
              <span aria-hidden className="w-16 h-16 rounded-full bg-green-50 border border-green-200 text-green-800 text-2xl font-bold inline-flex items-center justify-center shrink-0">{initialOf(t.name || 'A')}</span>
            )}
            <div className="flex-1 min-w-0">
              <ImageUploader
                value={t.avatarUrl}
                onChange={url => setT({ ...t, avatarUrl: url })}
                folder="landing/testimonials"
                previewClass={t.avatarUrl ? 'w-16 h-16 !rounded-full' : 'hidden'}
                label="Upload foto"
                hint="Opsional · kosong = inisial"
                compact
              />
            </div>
          </div>
          <TextField label="Nama" required value={t.name} onChange={v => setT({ ...t, name: v })} max={LIMITS.testimonialName} error={tried ? errors.name ?? undefined : undefined} />
          <TextField label="Kota / profesi" value={t.city} onChange={v => setT({ ...t, city: v })} max={LIMITS.testimonialCity} />
          <div>
            <p className="text-base font-semibold text-primary mb-1">Rating</p>
            <RatingInput value={t.rating} onChange={rating => setT({ ...t, rating })} />
          </div>
          <TextField
            label="Kutipan" required multiline rows={4}
            value={t.quote} onChange={v => setT({ ...t, quote: v })} max={LIMITS.quote}
            placeholder="Tempel kutipan persis seperti yang ditulis pengguna"
            error={tried ? errors.quote ?? undefined : undefined}
          />
          <label className={cn('flex gap-3 items-start rounded-md p-3.5 cursor-pointer', errors.consent && tried ? 'bg-rose-50 border border-rose-300' : 'bg-sunken')}>
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-[var(--green-600)] shrink-0"
              checked={!!t.consentAt}
              onChange={e => setT({ ...t, consentAt: e.target.checked ? (item.consentAt ?? new Date().toISOString()) : null })}
            />
            <span className="text-base text-primary leading-normal">
              <strong className="font-semibold">Pengguna sudah mengizinkan</strong> testimoni & namanya ditampilkan di website. <span className="text-secondary">Wajib untuk status Tayang.</span>
            </span>
          </label>
          <div>
            <p className="text-base font-semibold text-primary mb-1.5">Status</p>
            <SegmentedControl
              ariaLabel="Status testimoni"
              value={t.status}
              onChange={status => setT({ ...t, status })}
              options={[{ value: 'live', label: 'Tayang' }, { value: 'draft', label: 'Draf' }]}
              mobileGrid={false}
            />
            {errors.consent && (tried || t.status === 'live') && <p className="mt-1.5 text-sm text-rose-600" role="alert">{errors.consent}</p>}
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2">
          {!isNew && <Button variant="outline-danger" onClick={onDelete}>Hapus</Button>}
          <span className="flex-1" />
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function TestimonialsForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const x = c.testimonials
  const set = (patch: Partial<Testimonials>) => update('testimonials', { ...x, ...patch })
  const [editing, setEditing] = useState<{ item: Testimonial; isNew: boolean } | null>(null)
  const liveCount = x.items.filter(t => t.status === 'live' && t.consentAt).length

  return (
    <div className="flex flex-col gap-5">
      {!c.visibility.testimonials && (
        <Alert variant="warning">
          Section masih disembunyikan. Nyalakan toggle di <strong>Susunan Halaman</strong> setelah ada minimal 1 testimoni berstatus <strong>Tayang</strong>.
        </Alert>
      )}
      {c.visibility.testimonials && liveCount === 0 && (
        <Alert variant="warning">Belum ada testimoni Tayang — section ini otomatis tidak ditampilkan saat terbit.</Alert>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Label kecil" value={x.eyebrow} onChange={v => set({ eyebrow: v })} max={LIMITS.eyebrow} />
        <TextField label="Judul" required value={x.title} onChange={v => set({ title: v })} max={LIMITS.sectionTitle} />
      </div>
      <TextField label="Deskripsi" optional value={x.subtitle} onChange={v => set({ subtitle: v })} max={LIMITS.sectionSubtitle} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ToggleCard checked={x.autoplay} onChange={v => set({ autoplay: v })} label="Geser otomatis (6 dtk)" />
        <ToggleCard checked={x.showRating} onChange={v => set({ showRating: v })} label="Tampilkan rating" />
      </div>

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Daftar testimoni" count={x.items.length}
          action={<Button onClick={() => setEditing({ isNew: true, item: { id: newId('testi'), name: '', city: '', rating: 5, quote: '', avatarUrl: null, consentAt: null, status: 'draft' } })}>+ Tambah testimoni</Button>}
        />
        {x.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong p-6 text-center text-sm text-secondary">Belum ada testimoni. Tambahkan testimoni asli dari pengguna (dengan izin mereka).</p>
        ) : (
          <SortableList
            items={x.items}
            getId={t => t.id}
            onReorder={items => set({ items })}
            className="rounded-md border border-border divide-y divide-border overflow-hidden"
            renderItem={(t, handle) => (
              <div className={cn('flex items-center gap-3 pl-1.5 pr-3 py-2.5 bg-surface', editing?.item.id === t.id && 'bg-green-50 shadow-[inset_3px_0_0_var(--green-600)]')}>
                <DragHandle label={`Urutkan testimoni ${t.name}`} {...handle} />
                {t.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={t.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  : <span aria-hidden className="w-10 h-10 rounded-full bg-green-100 text-green-800 font-bold inline-flex items-center justify-center shrink-0">{initialOf(t.name)}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-primary truncate">{t.name || 'Tanpa nama'}</p>
                  <p className="text-sm text-secondary truncate">{t.status === 'live' || t.consentAt ? `${t.city || '—'} · ★ ${t.rating}` : 'Menunggu izin pengguna'}</p>
                </div>
                <StatusPill status={t.status === 'live' && t.consentAt ? 'live' : 'draft'} />
                <button type="button" onClick={() => setEditing({ item: t, isNew: false })} aria-label={`Edit testimoni ${t.name}`} className="w-10 h-10 inline-flex items-center justify-center rounded-sm border border-border-strong text-bark-800 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
                  <Pencil size={15} aria-hidden />
                </button>
              </div>
            )}
          />
        )}
        <p className="text-sm text-secondary leading-normal">Hanya testimoni berstatus Tayang dengan izin pengguna yang muncul di landing. Tidak ada testimoni aktif → section otomatis tidak dirender.</p>
      </div>

      {editing && (
        <TestimonialDrawer
          item={editing.item}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onDelete={() => { set({ items: x.items.filter(i => i.id !== editing.item.id) }); setEditing(null) }}
          onSave={t => {
            set({ items: editing.isNew ? [...x.items, t] : x.items.map(i => (i.id === t.id ? t : i)) })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
