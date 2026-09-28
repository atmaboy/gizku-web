'use client'
import { AlertTriangle } from 'lucide-react'
import { Badge, FormField, Input, SegmentedControl, Select } from '@/components/admin/ui'
import { LIMITS } from '@/lib/landing/publish-rules'
import { STAT_METRICS, newId, type StatItem, type Stats } from '@/lib/landing/schema'
import { formatStat } from '@/lib/landing/format'
import { METRIC_LABELS } from '@/lib/landing/stats'
import { useBuilder, useDraft } from '../BuilderContext'
import { AddButton, ItemCard, ListHeader, RemoveButton, SwatchChoice, TextField, useOpenItem } from '../fields'
import SortableList, { DragHandle } from '../SortableList'

export default function StatsForm() {
  const { update, metrics } = useBuilder()
  const c = useDraft()
  const x = c.stats
  const set = (patch: Partial<Stats>) => update('stats', { ...x, ...patch })
  const setItem = (id: string, patch: Partial<StatItem>) => set({ items: x.items.map(i => (i.id === id ? { ...i, ...patch } : i)) })
  const { open, toggle, setOpen } = useOpenItem(x.items[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-5">
      <TextField label="Kalimat pengantar" optional value={x.intro} onChange={v => set({ intro: v })} max={LIMITS.statsIntro} help="Tampil di kiri band (desktop)." />
      <SwatchChoice
        label="Warna band"
        value={x.band}
        onChange={band => set({ band })}
        options={[
          { value: 'green', label: 'Hijau tua', swatch: 'bg-green-700' },
          { value: 'sand', label: 'Sand', swatch: 'bg-sand-100' },
          { value: 'dark', label: 'Gelap', swatch: 'bg-bark-900' },
        ]}
      />

      <div className="flex flex-col gap-3">
        <ListHeader
          title="Angka" count={x.items.length} max={LIMITS.statItems}
          action={(
            <AddButton
              disabled={x.items.length >= LIMITS.statItems}
              onClick={() => {
                const it: StatItem = { id: newId('stat'), source: 'auto', metric: 'users_login_30d', format: 'floor_plus', value: '', label: '', resolvedValue: null }
                set({ items: [...x.items, it] })
                setOpen(it.id)
              }}
            >Tambah angka</AddButton>
          )}
        />
        <SortableList
          items={x.items}
          getId={i => i.id}
          onReorder={items => set({ items })}
          className="flex flex-col gap-2.5"
          renderItem={(it, handle, idx) => {
            const preview = it.source === 'auto' && it.metric && metrics ? formatStat(metrics[it.metric], it.format) : null
            return (
              <ItemCard
                open={open === it.id}
                onToggle={() => toggle(it.id)}
                handle={<DragHandle label={`Urutkan angka ${idx + 1}`} {...handle} />}
                title={open === it.id ? `Angka ${idx + 1}` : (it.source === 'manual' ? `${it.value || '—'} · ${it.label || 'Tanpa label'}` : (it.label || 'Tanpa label'))}
                subtitle={open === it.id ? undefined : (it.source === 'auto' ? `Otomatis · ${it.metric ? METRIC_LABELS[it.metric].hint : '-'}${preview ? ` · sekarang ${preview}` : ''}` : 'Manual')}
                trailing={it.source === 'auto' ? <Badge variant="soft" size="sm">Otomatis</Badge> : <Badge variant="honeysoft" size="sm">Manual</Badge>}
              >
                <div>
                  <p className="text-base font-semibold text-primary mb-1.5">Sumber nilai</p>
                  <SegmentedControl
                    ariaLabel="Sumber nilai"
                    value={it.source}
                    onChange={source => setItem(it.id, source === 'auto'
                      ? { source, metric: it.metric ?? 'users_active', format: 'floor_plus' }
                      : { source, format: 'full' })}
                    options={[{ value: 'auto', label: 'Otomatis dari data' }, { value: 'manual', label: 'Isi manual' }]}
                    mobileGrid={false}
                  />
                </div>
                {it.source === 'auto' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Metrik" htmlFor={`m-${it.id}`}>
                      <Select id={`m-${it.id}`} value={it.metric ?? ''} onChange={e => setItem(it.id, { metric: e.target.value as StatItem['metric'] })}>
                        {STAT_METRICS.map(m => <option key={m} value={m}>{METRIC_LABELS[m].label}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Format" htmlFor={`f-${it.id}`}>
                      <Select id={`f-${it.id}`} value={it.format} onChange={e => setItem(it.id, { format: e.target.value as StatItem['format'] })}>
                        <option value="floor_plus">Bulatkan ke bawah + “+”</option>
                        <option value="full">Angka penuh</option>
                      </Select>
                    </FormField>
                  </div>
                ) : (
                  <FormField label="Nilai" htmlFor={`v-${it.id}`} required>
                    <Input id={`v-${it.id}`} value={it.value} placeholder="mis. 95%" invalid={it.value.length > LIMITS.statValue} onChange={e => setItem(it.id, { value: e.target.value })} />
                  </FormField>
                )}
                <TextField label="Label" value={it.label} onChange={v => setItem(it.id, { label: v })} max={LIMITS.statLabel} required />
                {it.source === 'auto'
                  ? <p className="text-sm text-secondary">Nilai dihitung ulang setiap kali halaman diterbitkan, jadi angka tidak basi.{preview && <> Saat ini: <strong className="text-primary">{preview}</strong>.</>}</p>
                  : (
                    <p className="flex gap-2 text-sm text-bark-800 bg-honey-50 border border-honey-300 rounded-md px-3 py-2">
                      <AlertTriangle size={16} className="text-honey-500 shrink-0 mt-0.5" aria-hidden />
                      Angka manual tampil apa adanya. Pastikan ada dasar pengukurannya sebelum terbit.
                    </p>
                  )}
                <div className="flex justify-end"><RemoveButton label={`Hapus angka ${idx + 1}`} onClick={() => set({ items: x.items.filter(i => i.id !== it.id) })} /></div>
              </ItemCard>
            )
          }}
        />
      </div>
    </div>
  )
}
