'use client'

import { useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import ListItem from '@/components/ui/ListItem'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Tentang Aplikasi" onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-7 pb-10 flex flex-col items-center">
        <div className="text-2xl font-semibold text-primary tracking-tight">Gizku</div>
        <div className="text-sm text-secondary mt-0.5">Versi 1.2.0</div>
        <div className="text-sm text-secondary text-center leading-normal max-w-[280px] mt-3.5">
          Foto makananmu dan biarkan AI menghitung kalori serta nutrisinya secara instan — tanpa perlu mencatat manual.
        </div>

        <Card className="w-full overflow-hidden mt-6">
          <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
            <ListItem label="Kebijakan Privasi" showChevron={false} />
          </div>
          <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
            <ListItem label="Syarat & Ketentuan" showChevron={false} />
          </div>
          <a href="https://gizku.com" target="_blank" rel="noopener noreferrer" className="block">
            <ListItem label="Kunjungi Website" supporting="gizku.com" showChevron={false} />
          </a>
        </Card>

        <div className="text-center text-2xs text-tertiary mt-6">© 2026 gizku.com</div>
      </div>
    </div>
  )
}
