'use client'
import { ArrowRight } from 'lucide-react'
import { Button, Card, Input, Switch } from '@/components/admin/ui'
import { BrandIcon } from '@/components/landing/sections/icons'
import { LIMITS } from '@/lib/landing/publish-rules'
import type { Settings, StoreKey } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { useBuilder, useDraft } from '../BuilderContext'
import { TextField } from '../fields'
import ImageUploader from '../ImageUploader'

const SITE_HOST = (process.env.NEXT_PUBLIC_APP_URL || 'https://gizku.com').replace(/^https?:\/\//, '').replace(/\/$/, '')

const STORES: { key: StoreKey; label: string; placeholder: string; tile: string }[] = [
  { key: 'appStore', label: 'App Store', placeholder: 'https://apps.apple.com/app/[id-aplikasi]', tile: 'bg-bark-900 text-white' },
  { key: 'googlePlay', label: 'Google Play', placeholder: 'https://play.google.com/store/apps/details?id=[package]', tile: 'bg-bark-900 text-white' },
  { key: 'telegram', label: 'Telegram bot', placeholder: 'https://t.me/[username_bot]', tile: 'bg-green-50 text-green-700' },
]

export default function SettingsForm() {
  const { update } = useBuilder()
  const c = useDraft()
  const s = c.settings
  const set = (patch: Partial<Settings>) => update('settings', { ...s, ...patch })
  const setStore = (k: StoreKey, patch: Partial<Settings['stores'][StoreKey]>) => set({ stores: { ...s.stores, [k]: { ...s.stores[k], ...patch } } })
  const descOver = s.seo.description.length > LIMITS.seoDescription

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3.5 flex flex-wrap items-center gap-3">
          <p className="flex-1 min-w-[220px] text-base text-green-800 leading-normal m-0">
            Halaman ini hanya untuk setelan yang dipakai lintas section. Menu navigasi & tombol header diatur di section <strong>Header & Navigasi</strong>.
          </p>
          <Button variant="outline-primary" iconRight={ArrowRight} href="/admin/landing/header">Buka Header</Button>
        </div>
        <Card title="Tujuan tombol “otomatis”" subtitle="Dipakai semua tombol bertujuan Otomatis (hero, CTA bawah, header).">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Pengunjung (belum login)" mono value={s.ctaUrlGuest} onChange={v => set({ ctaUrlGuest: v })} placeholder="/login" />
            <TextField label="User sudah login" mono value={s.ctaUrlAuth} onChange={v => set({ ctaUrlAuth: v })} placeholder="/main/riwayat" />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card title="Tautan download & kanal" subtitle="Badge tampil di hero dan CTA bawah hanya jika aktif dan tautannya terisi.">
          <ul className="m-0 p-0 list-none divide-y divide-border">
            {STORES.map(st => {
              const v = s.stores[st.key]
              return (
                <li key={st.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span aria-hidden className={cn('w-12 h-12 rounded-md inline-flex items-center justify-center shrink-0', st.tile)}>
                    <BrandIcon name={st.key === 'appStore' ? 'apple' : st.key === 'googlePlay' ? 'googlePlay' : 'telegram'} size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`store-${st.key}`} className="block text-base font-semibold text-primary mb-1">{st.label}</label>
                    <Input id={`store-${st.key}`} className="font-mono text-[13px]" value={v.url} placeholder={st.placeholder} onChange={e => setStore(st.key, { url: e.target.value })} />
                  </div>
                  <Switch checked={v.enabled} onChange={enabled => setStore(st.key, { enabled })} ariaLabel={`Aktifkan ${st.label}`} className="shrink-0 self-end mb-2" />
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-sm text-secondary">Tip: username bot Telegram ada di menu Telegram Bot. Tautan Telegram juga dipakai ikon Telegram di footer.</p>
        </Card>

        <Card title="SEO & berbagi" subtitle="Judul, deskripsi dan gambar saat halaman muncul di Google atau dibagikan.">
          <div className="flex flex-col gap-4">
            <TextField label="Judul halaman" value={s.seo.title} onChange={v => set({ seo: { ...s.seo, title: v } })} max={LIMITS.seoTitle} />
            <TextField
              label="Deskripsi" multiline rows={3}
              value={s.seo.description} onChange={v => set({ seo: { ...s.seo, description: v } })}
              max={LIMITS.seoDescription}
              overMessage={`Terlalu panjang — Google memotong setelah ±${LIMITS.seoDescription} karakter.`}
            />
            <div>
              <p className="text-base font-semibold text-primary mb-1.5">Gambar share (OG) 1200×630</p>
              <ImageUploader
                value={s.seo.ogImageUrl}
                onChange={url => set({ seo: { ...s.seo, ogImageUrl: url } })}
                folder="landing/og"
                previewClass="w-40 h-[84px]"
                hint="PNG/JPEG/WebP 1200×630, maks 5 MB. Kosong = gambar OG bawaan."
              />
            </div>
            <div aria-label="Pratinjau hasil Google" className="rounded-md border border-border px-4 py-3">
              <p className="text-xs text-secondary m-0">{SITE_HOST}</p>
              <p className="text-[18px] leading-snug text-tgc-700 m-0 truncate">{s.seo.title || 'Judul halaman'}</p>
              <p className={cn('text-sm leading-normal m-0 line-clamp-2', descOver ? 'text-bark-800' : 'text-secondary')}>
                {s.seo.description.length > LIMITS.seoDescription ? `${s.seo.description.slice(0, LIMITS.seoDescription - 3)}...` : s.seo.description}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
