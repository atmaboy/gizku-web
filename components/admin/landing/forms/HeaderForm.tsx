'use client'
import { Input, Switch } from '@/components/admin/ui'
import { LIMITS } from '@/lib/landing/publish-rules'
import { SECTION_LABELS, newId, type NavItem } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, LinkField, ListHeader, RemoveButton, TargetSelect, TextField, ToggleCard } from '../fields'
import ImageUploader from '../ImageUploader'
import SortableList, { DragHandle } from '../SortableList'

export default function HeaderForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const h = c.header
  const set = (patch: Partial<typeof h>) => update('header', { ...h, ...patch })
  const setNav = (nav: NavItem[]) => set({ nav })
  const hiddenSection = (item: NavItem) => item.target.kind === 'section' && !c.visibility[item.target.section]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <TextField label="Nama brand di samping logo" value={h.brandName} onChange={v => set({ brandName: v })} max={30} required />
        <div>
          <p className="text-base font-semibold text-primary mb-1.5">Logo</p>
          <ImageUploader
            value={h.logoUrl}
            onChange={url => set({ logoUrl: url })}
            folder="landing/logo"
            previewClass="w-16 h-16"
            label="Ganti logo"
            hint="SVG atau PNG persegi, maks 1 MB. Kosong = logo Gizku bawaan."
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Menu navigasi"
          count={h.nav.length}
          max={LIMITS.nav}
          action={<AddButton disabled={h.nav.length >= LIMITS.nav} onClick={() => setNav([...h.nav, { id: newId('nav'), label: '', target: { kind: 'section', section: 'faq' }, active: true }])}>Tambah menu</AddButton>}
        />
        <SortableList
          items={h.nav}
          getId={n => n.id}
          onReorder={setNav}
          className="flex flex-col gap-2.5"
          renderItem={(n, handle, i) => {
            const off = hiddenSection(n)
            const patch = (p: Partial<NavItem>) => setNav(h.nav.map(x => (x.id === n.id ? { ...x, ...p } : x)))
            return (
              <div className="rounded-md border border-border p-2.5 flex items-start gap-2">
                <DragHandle label={`Urutkan menu ${n.label || i + 1}`} {...handle} className="mt-1" />
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input aria-label={`Label menu ${i + 1}`} value={n.label} placeholder="Label" invalid={n.label.length > LIMITS.linkLabel} onChange={e => patch({ label: e.target.value })} className={off || !n.active ? 'text-secondary' : undefined} />
                  <TargetSelect ariaLabel={`Tujuan menu ${i + 1}`} value={n.target} allowAuto={false} onChange={t => patch({ target: t })} sectionHidden={k => !c.visibility[k]} />
                  {off && <p className="sm:col-span-2 text-sm text-secondary">Section {n.target.kind === 'section' ? SECTION_LABELS[n.target.section] : ''} disembunyikan — menu ini otomatis tidak tampil.</p>}
                </div>
                <div className="flex items-center gap-1 pt-1.5">
                  <Switch checked={n.active && !off} disabled={off} onChange={v => patch({ active: v })} ariaLabel={`Aktifkan menu ${n.label}`} />
                  <RemoveButton label={`Hapus menu ${n.label}`} onClick={() => setNav(h.nav.filter(x => x.id !== n.id))} />
                </div>
              </div>
            )
          }}
        />
        <p className="text-sm text-secondary leading-normal">Tujuan bisa section di halaman ini atau URL (mis. /legal/kebijakan-privasi). Menu ke section yang disembunyikan otomatis ikut nonaktif.</p>
      </div>

      <div className="flex flex-col gap-3 pt-5 border-t border-border">
        <h3 className="text-md font-semibold text-primary">Tombol kanan header</h3>
        <LinkField label="Label" value={h.button} onChange={button => set({ button })} sectionHidden={k => !c.visibility[k]} />
        <p className="text-sm text-secondary">User yang sudah login melihat avatar + nama sebagai ganti tombol ini.</p>
      </div>

      <ToggleCard checked={h.sticky} onChange={v => set({ sticky: v })} label="Header menempel saat scroll" description="Latar semi-transparan + garis bawah tipis." />
    </div>
  )
}
