import {
  Bell, Linkedin, Camera, Clock, Globe, Heart, History, ScanLine, Send, ShieldCheck, Sparkles, Target, TrendingUp,
  UtensilsCrossed, Zap, type LucideIcon,
} from 'lucide-react'
import type { IconKey, SocialPlatform } from '@/lib/landing/schema'
import { BRAND_PATHS, type BrandKey } from './brandPaths'

/** Icon set offered by the builder's IconPicker (key → lucide icon). */
export const LANDING_ICONS: Record<IconKey, { icon: LucideIcon; label: string }> = {
  camera: { icon: Camera, label: 'Kamera' },
  sparkle: { icon: Sparkles, label: 'Sparkle / AI' },
  chart: { icon: TrendingUp, label: 'Grafik' },
  scan: { icon: ScanLine, label: 'Scan' },
  history: { icon: History, label: 'Riwayat' },
  send: { icon: Send, label: 'Kirim / Telegram' },
  bolt: { icon: Zap, label: 'Kilat' },
  globe: { icon: Globe, label: 'Bahasa' },
  shield: { icon: ShieldCheck, label: 'Keamanan' },
  heart: { icon: Heart, label: 'Kesehatan' },
  clock: { icon: Clock, label: 'Waktu' },
  bell: { icon: Bell, label: 'Notifikasi' },
  utensils: { icon: UtensilsCrossed, label: 'Makanan' },
  target: { icon: Target, label: 'Target' },
}

export function LandingIcon({ name, size = 24, strokeWidth = 1.8, className }: { name: IconKey; size?: number; strokeWidth?: number; className?: string }) {
  const Icon = LANDING_ICONS[name]?.icon ?? Sparkles
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />
}

export function BrandIcon({ name, size = 20, className }: { name: BrandKey; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d={BRAND_PATHS[name]} />
    </svg>
  )
}

export function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function StarIcon({ size = 18, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={filled ? undefined : 'opacity-30'}>
      <path d="M12 2.5l2.95 6.1 6.55.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6-4.8-4.6 6.55-.9z" />
    </svg>
  )
}

const SOCIAL_GLYPH: Record<Exclude<SocialPlatform, 'linkedin'>, BrandKey> = {
  telegram: 'telegram', instagram: 'instagram', facebook: 'facebook', x: 'x', threads: 'threads',
  youtube: 'youtube', whatsapp: 'whatsapp', tiktok: 'tiktok',
}

/** Social media logo (brand glyph, currentColor). */
export function SocialIcon({ platform, size = 20, className }: { platform: SocialPlatform; size?: number; className?: string }) {
  if (platform === 'linkedin') return <Linkedin size={size} className={className} aria-hidden />
  return <BrandIcon name={SOCIAL_GLYPH[platform]} size={size} className={className} />
}
