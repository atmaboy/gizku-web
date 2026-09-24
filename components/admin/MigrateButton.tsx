'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { DatabaseZap } from 'lucide-react'
import { Alert, Button } from '@/components/admin/ui'

export default function MigrateButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, number> | null>(null)

  async function run() {
    if (!confirm('Jalankan migrasi KV → PostgreSQL?\nAman untuk diulang.')) return
    setLoading(true)
    try {
      const r = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (r.ok) {
        setResult(d.migrated)
        toast.success('Migrasi berhasil!')
      } else {
        toast.error(d.error)
      }
    } catch {
      toast.error('Gagal koneksi')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base text-secondary">
        Pindahkan data lama dari <strong className="text-primary">Supabase KV Store</strong> ke PostgreSQL.
        Jalankan <strong className="text-primary">sekali</strong> setelah deploy pertama.
      </p>
      <div>
        <Button variant="warning" icon={DatabaseZap} loading={loading} onClick={run}>
          {loading ? 'Migrasi berjalan…' : 'Jalankan Migrasi KV → PostgreSQL'}
        </Button>
      </div>
      {result && (
        <Alert variant="info" title="Migrasi selesai:">
          <span className="font-mono text-sm">Users: {result.users} · Meals: {result.meals} · Reports: {result.reports} · Config: {result.config}</span>
        </Alert>
      )}
    </div>
  )
}
