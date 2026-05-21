'use client'
import { useState } from 'react'
import GizkuLogo from '@/components/GizkuLogo'

export default function AdminLogin() {
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
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
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white ring-1 ring-[#E5E7EB] rounded-2xl shadow-[0_8px_24px_rgba(16,24,40,0.06)] p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <GizkuLogo size={52} />
          </div>
          <h1 className="text-[22px] font-semibold text-[#111827] tracking-[-0.02em]">Gizku Admin</h1>
          <p className="text-sm text-[#6B7280] mt-1">Masuk ke panel backoffice</p>
        </div>
        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#111827] block mb-1.5">Password</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm bg-white text-[#111827]
                placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2DBD74] focus:border-transparent transition"
            />
          </div>
          {msg && <p className="text-sm text-red-500">{msg}</p>}
          <button
            type="submit"
            disabled={loading || !pwd}
            className="w-full bg-[#2DBD74] text-white py-2.5 rounded-xl text-sm font-semibold
              hover:bg-[#25A865] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Masuk…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
