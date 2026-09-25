'use client'
import { useState } from 'react'
import { Lock, LogIn } from 'lucide-react'
import GizkuLogo from '@/components/GizkuLogo'
import { Button, Card, FormField, Input, InputGroup } from '@/components/admin/ui'

export default function AdminLogin() {
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const r = await fetch('/api/admin?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      const d = await r.json()
      if (r.ok) {
        document.cookie = `nl_admin_token=${d.token}; path=/; max-age=14400; samesite=strict`
        window.location.href = '/admin'
      } else {
        setMsg(d.error || 'Login gagal')
        setLoading(false)
      }
    } catch {
      setMsg('Gagal menghubungi server')
      setLoading(false)
    }
  }

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-sunken flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-3 mb-6">
          <GizkuLogo size={48} className="max-lg:w-11 max-lg:h-11" />
          <h1 className="text-[34px] max-lg:text-[28px] text-primary tracking-[-0.02em] leading-none">
            <strong className="font-bold">Gizku</strong> <span className="font-light">Admin</span>
          </h1>
        </div>

        <Card outline="brand" bodyClassName="p-6">
          <p className="text-center text-[15px] text-secondary mb-5">Masuk ke panel backoffice</p>
          <form onSubmit={login} className="flex flex-col gap-4" noValidate>
            <FormField label="Password" htmlFor="admin-pwd" error={msg || undefined}>
              <InputGroup append={<span className="px-3 flex items-center"><Lock size={16} aria-hidden /></span>}>
                <Input
                  id="admin-pwd"
                  type="password"
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  autoComplete="current-password"
                  invalid={!!msg}
                />
              </InputGroup>
            </FormField>
            <Button type="submit" icon={LogIn} fullWidth loading={loading} disabled={loading || !pwd}>
              {loading ? 'Masuk…' : 'Masuk'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-secondary mt-5">© {year} Gizku · AI Nutrition Companion</p>
      </div>
    </div>
  )
}
