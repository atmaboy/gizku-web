'use client'
import { useState } from 'react'
import { Bug, Rocket, Sparkles, Wrench, Zap, type LucideIcon } from 'lucide-react'
import { Alert, Badge, Card, Code, KeyValue, Tabs } from '@/components/admin/ui'
import type { BadgeVariant } from '@/components/admin/ui'
import { PLATFORM_LABEL, type ChangeType, type FeatureGroup, type Platform, type Release } from '@/lib/releaseNotes'

export type PlatformData = { features: FeatureGroup[]; releases: Release[] }

const CHANGE_STYLE: Record<ChangeType, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  feat:    { label: 'Fitur',      variant: 'success',   icon: Sparkles },
  fix:     { label: 'Perbaikan',  variant: 'warning',   icon: Bug },
  improve: { label: 'Peningkatan', variant: 'soft',     icon: Zap },
  chore:   { label: 'Lainnya',    variant: 'light',     icon: Wrench },
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function releaseBadge(r: Release, platform: Platform) {
  if (r.status === 'unreleased') return <Badge variant="honeysoft">Belum dirilis ke store</Badge>
  return <Badge variant="soft">{platform === 'web' ? 'Live di production' : 'Dirilis'}</Badge>
}

export default function ReleasesView({ data, deployedSha }: { data: Record<Platform, PlatformData>; deployedSha: string | null }) {
  const [tab, setTab] = useState<Platform>('web')
  const { features, releases } = data[tab]
  const current = releases[0]
  const lastStore = releases.find(r => r.status !== 'unreleased')

  return (
    <>
      <Tabs
        variant="pills"
        ariaLabel="Platform"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'web', label: PLATFORM_LABEL.web },
          { value: 'mobile', label: PLATFORM_LABEL.mobile },
        ]}
      />

      <Card title="Versi saat ini" icon={Rocket} outline="brand">
        <KeyValue
          items={[
            { label: 'Versi terbaru', value: <span className="inline-flex items-center gap-2">v{current.version} {releaseBadge(current, tab)}</span> },
            { label: 'Tanggal', value: fmtDate(current.date) },
            ...(tab === 'mobile' && lastStore && lastStore !== current
              ? [{ label: 'Versi terakhir di store', value: `v${lastStore.version} · ${fmtDate(lastStore.date)}` }]
              : []),
            ...(tab === 'web'
              ? [{ label: 'Commit ter-deploy', value: deployedSha ? <Code>{deployedSha.slice(0, 7)}</Code> : <span className="text-secondary font-normal">tidak tersedia di environment ini</span> }]
              : []),
          ]}
        />
        {current.note && <p className="mt-3 text-sm text-secondary">{current.note}</p>}
      </Card>

      <Card title="Daftar fitur" subtitle={`Fitur ${PLATFORM_LABEL[tab]} saat ini`}>
        <div className="flex flex-col gap-5">
          {features.map(g => (
            <section key={g.group}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary mb-2">{g.group}</h3>
              <ul className="list-none m-0 p-0 divide-y divide-border">
                {g.items.map(it => (
                  <li key={it.name} className="py-2">
                    <div className="text-base font-semibold text-primary">{it.name}</div>
                    <div className="text-sm text-secondary mt-0.5">{it.description}</div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      <Card title="Release notes" subtitle="Terbaru di atas">
        <div className="flex flex-col gap-6">
          {releases.map(r => (
            <section key={r.version}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="text-md font-semibold text-primary">v{r.version}</h3>
                {releaseBadge(r, tab)}
                <span className="text-sm text-secondary">{fmtDate(r.date)}</span>
              </div>
              {r.note && <p className="text-sm text-secondary mb-2">{r.note}</p>}
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {r.changes.map((c, i) => {
                  const s = CHANGE_STYLE[c.type]
                  return (
                    <li key={i} className="flex flex-col items-start gap-1 sm:flex-row sm:gap-2.5">
                      <Badge variant={s.variant} icon={s.icon} size="sm" className="shrink-0 sm:mt-0.5 sm:min-w-[88px] justify-center">{s.label}</Badge>
                      <span className="text-base text-primary min-w-0">{c.text}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      <Alert variant="light" title="Aturan rilis:">
        Setiap merge ke <Code>main</Code> / deploy production wajib memperbarui <Code>lib/releaseNotes.ts</Code> (entry baru + naikkan versi + daftar fitur bila berubah). Release notes mobile juga dikelola di sini. Detail di <Code>CLAUDE.md</Code>.
      </Alert>
    </>
  )
}
