'use client'
import { Input, Select, Switch, TrackedLink } from '@/components/admin/ui'
import { SocialIcon } from '@/components/landing/sections/icons'
import { LIMITS } from '@/lib/landing/publish-rules'
import { SOCIAL_LABELS, SOCIAL_PLATFORMS, newId, type Footer, type FooterLink, type LinkGroup, type Social } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, ItemCard, ListHeader, RemoveButton, TargetSelect, TextField, useOpenItem } from '../fields'
import SortableList, { DragHandle } from '../SortableList'

export default function FooterForm() {
  const { update, legalDocs } = useBuilder()
  const c = useDraft()
  const x = c.footer
  const set = (patch: Partial<Footer>) => update('footer', { ...x, ...patch })
  const setSocial = (id: string, patch: Partial<Social>) => set({ socials: x.socials.map(s => (s.id === id ? { ...s, ...patch } : s)) })
  const setGroup = (id: string, patch: Partial<LinkGroup>) => set({ groups: x.groups.map(g => (g.id === id ? { ...g, ...patch } : g)) })
  const setLink = (g: LinkGroup, id: string, patch: Partial<FooterLink>) => setGroup(g.id, { links: g.links.map(l => (l.id === id ? { ...l, ...patch } : l)) })
  const { open, toggle, setOpen } = useOpenItem(x.groups[0]?.id ?? null)
  const tgUrl = c.settings.stores.telegram.url

  return (
    <div className="flex flex-col gap-6">
      <TextField label="Tagline di bawah logo" value={x.tagline} onChange={v => set({ tagline: v })} max={LIMITS.tagline} />

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Sosial media" count={x.socials.length}
          action={<AddButton disabled={x.socials.length >= 10} onClick={() => set({ socials: [...x.socials, { id: newId('soc'), platform: 'instagram', url: 'https://' }] })}>Tambah</AddButton>}
        />
        <SortableList
          items={x.socials}
          getId={s => s.id}
          onReorder={socials => set({ socials })}
          className="flex flex-col gap-2"
          renderItem={(s, handle) => (
            <div className="flex items-center gap-2">
              <DragHandle label={`Urutkan ${SOCIAL_LABELS[s.platform]}`} {...handle} />
              <span aria-hidden className="w-10 h-10 rounded-full bg-bark-900 text-sand-200 inline-flex items-center justify-center shrink-0">
                <SocialIcon platform={s.platform} size={18} />
              </span>
              <Select aria-label="Platform" className="!w-40 shrink-0" value={s.platform} onChange={e => setSocial(s.id, { platform: e.target.value as Social['platform'] })}>
                {SOCIAL_PLATFORMS.filter(p => p !== 'linkedin' || s.platform === 'linkedin').map(p => <option key={p} value={p}>{SOCIAL_LABELS[p]}</option>)}
              </Select>
              {s.platform === 'telegram'
                ? <Input aria-label="URL Telegram" disabled value={tgUrl ? `Ikut tautan bot: ${tgUrl}` : 'Ikut tautan bot (Pengaturan global) — belum diisi'} />
                : <Input aria-label={`URL ${SOCIAL_LABELS[s.platform]}`} className="font-mono text-[13px]" value={s.url} placeholder="https://" onChange={e => setSocial(s.id, { url: e.target.value })} />}
              <RemoveButton label={`Hapus ${SOCIAL_LABELS[s.platform]}`} onClick={() => set({ socials: x.socials.filter(i => i.id !== s.id) })} />
            </div>
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Grup link" count={x.groups.length} max={LIMITS.footerGroups}
          action={<AddButton disabled={x.groups.length >= LIMITS.footerGroups} onClick={() => {
            const g: LinkGroup = { id: newId('grp'), name: '', kind: 'custom', links: [] }
            set({ groups: [...x.groups, g] })
            setOpen(g.id)
          }}>Tambah grup</AddButton>}
        />
        <SortableList
          items={x.groups}
          getId={g => g.id}
          onReorder={groups => set({ groups })}
          className="flex flex-col gap-2.5"
          renderItem={(g, handle) => {
            const synced = g.kind === 'legal' && x.legalAutoSync
            const links = synced ? legalDocs.map(d => d.title) : g.links.map(l => l.label)
            return (
              <ItemCard
                open={open === g.id}
                onToggle={() => toggle(g.id)}
                handle={<DragHandle label={`Urutkan grup ${g.name}`} {...handle} />}
                title={g.name || 'Grup tanpa nama'}
                subtitle={synced ? 'Sinkron otomatis dari menu Dokumen Legal' : (links.join(' · ') || 'Belum ada link')}
              >
                <TextField label="Nama grup" value={g.name} onChange={v => setGroup(g.id, { name: v })} max={30} />
                <label className="flex items-center gap-2.5 text-base text-primary cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[var(--green-600)]" checked={g.kind === 'legal'} onChange={e => setGroup(g.id, { kind: e.target.checked ? 'legal' : 'custom' })} />
                  Grup Legal (bisa sinkron dari Dokumen Legal)
                </label>
                {g.kind === 'legal' && (
                  <div className="rounded-md bg-sunken px-4 py-3">
                    <Switch
                      checked={x.legalAutoSync}
                      onChange={v => set({ legalAutoSync: v })}
                      label="Sinkron otomatis dari menu Dokumen Legal"
                      description={<>Mengambil semua dokumen di <TrackedLink href="/admin/legal" className="text-link underline">Dokumen Legal</TrackedLink> ({legalDocs.length} dokumen).</>}
                    />
                  </div>
                )}
                {synced ? (
                  <ul className="m-0 pl-5 list-disc text-sm text-secondary">{legalDocs.map(d => <li key={d.slug}>{d.title} — /legal/{d.slug}</li>)}</ul>
                ) : (
                  <>
                    <SortableList
                      items={g.links}
                      getId={l => l.id}
                      onReorder={next => setGroup(g.id, { links: next })}
                      className="flex flex-col gap-2"
                      renderItem={(l, h) => (
                        <div className="flex items-start gap-2">
                          <DragHandle label={`Urutkan link ${l.label}`} {...h} className="mt-1" />
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input aria-label="Label link" value={l.label} placeholder="Label" onChange={e => setLink(g, l.id, { label: e.target.value })} />
                            <TargetSelect ariaLabel="Tujuan link" value={l.target} allowAuto={false} onChange={t => setLink(g, l.id, { target: t })} sectionHidden={k => !c.visibility[k]} />
                          </div>
                          <RemoveButton label={`Hapus link ${l.label}`} onClick={() => setGroup(g.id, { links: g.links.filter(i => i.id !== l.id) })} />
                        </div>
                      )}
                    />
                    <AddButton className="self-start" onClick={() => setGroup(g.id, { links: [...g.links, { id: newId('lnk'), label: '', target: { kind: 'internal', path: '/' } }] })}>Tambah link</AddButton>
                  </>
                )}
                <div className="flex justify-end"><RemoveButton label={`Hapus grup ${g.name}`} onClick={() => set({ groups: x.groups.filter(i => i.id !== g.id) })} /></div>
              </ItemCard>
            )
          }}
        />
      </div>

      <TextField label="Teks copyright" value={x.copyright} onChange={v => set({ copyright: v })} max={120} help="{tahun} otomatis diganti tahun berjalan." />
    </div>
  )
}
