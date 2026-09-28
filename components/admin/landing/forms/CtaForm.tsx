'use client'
import { TrackedLink } from '@/components/admin/ui'
import { LIMITS } from '@/lib/landing/publish-rules'
import { STORE_KEYS, type Cta, type StoreKey } from '@/lib/landing/schema'
import { useBuilder, useDraft } from '../BuilderContext'
import { Group, LinkField, SwatchChoice, TextField, ToggleCard } from '../fields'

const STORE_LABEL: Record<StoreKey, string> = { appStore: 'App Store', googlePlay: 'Google Play', telegram: 'Telegram' }

export default function CtaForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const x = c.cta
  const set = (patch: Partial<Cta>) => update('cta', { ...x, ...patch })
  const stores = c.settings.stores

  return (
    <div className="flex flex-col gap-5">
      <TextField label="Judul" required value={x.title} onChange={v => set({ title: v })} max={LIMITS.ctaTitle} />
      <TextField label="Deskripsi" multiline rows={2} value={x.subtitle} onChange={v => set({ subtitle: v })} max={LIMITS.ctaSubtitle} />
      <LinkField label="Label tombol" value={x.button} onChange={button => set({ button })} sectionHidden={k => !c.visibility[k]} />
      <SwatchChoice
        label="Gaya latar"
        value={x.bg}
        onChange={bg => set({ bg })}
        options={[
          { value: 'green', label: 'Hijau', swatch: 'bg-green-600' },
          { value: 'dark', label: 'Gelap', swatch: 'bg-bark-900' },
          { value: 'sand', label: 'Sand', swatch: 'bg-sand-100' },
        ]}
      />
      <Group title="Badge download">
        <ToggleCard checked={x.showBadges} onChange={v => set({ showBadges: v })} label="Tampilkan badge di bawah tombol" />
        {x.showBadges && (
          <>
            <TextField label="Teks di atas badge" value={x.badgeLabel} onChange={v => set({ badgeLabel: v })} max={60} />
            <ul className="m-0 p-0 list-none flex flex-col gap-1">
              {STORE_KEYS.map(k => {
                const st = stores[k]
                const ok = st.enabled && !!st.url.trim()
                return (
                  <li key={k} className="flex items-center justify-between gap-3 min-h-11">
                    <label className="flex items-center gap-2.5 text-base text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[var(--green-600)]"
                        checked={x.badges.includes(k)}
                        onChange={e => set({ badges: e.target.checked ? STORE_KEYS.filter(s => s === k || x.badges.includes(s)) : x.badges.filter(b => b !== k) })}
                      />
                      {STORE_LABEL[k]}
                    </label>
                    <span className={ok ? 'text-sm font-semibold text-green-700' : 'text-sm text-secondary'}>
                      {ok ? 'Tautan terisi' : st.url.trim() ? 'Nonaktif di Pengaturan global' : 'Tautan kosong'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <TrackedLink href="/admin/landing/settings" className="text-base font-semibold text-link hover:underline self-start">Ubah tautan di Pengaturan global →</TrackedLink>
          </>
        )}
      </Group>
    </div>
  )
}
