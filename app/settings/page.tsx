/**
 * /settings → redirect ke /main/settings
 * Fallback client-side redirect jika next.config redirects tidak terpicu
 * (misalnya jika ada middleware intercept lebih dulu)
 */
import { redirect } from 'next/navigation'

export default function SettingsRedirectPage() {
  redirect('/main/settings')
}

export const metadata = {
  title: 'Pengaturan - Gizku',
  robots: 'noindex, nofollow',
}
