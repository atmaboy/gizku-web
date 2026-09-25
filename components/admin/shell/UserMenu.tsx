'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/admin/ui'
import { cn } from '@/lib/utils'
import { adminLogout } from './nav'

/** AdminLTE "user-header" dropdown. `compact` = avatar-only trigger (mobile app bar). */
export default function UserMenu({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function logout() {
    setOpen(false)
    await adminLogout()
    router.push('/admin/login')
  }

  return (
    <div ref={rootRef} className={cn(!compact && 'relative')}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? 'Menu akun Administrator' : undefined}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 rounded-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
          compact ? 'w-11 h-11 justify-center' : 'h-10 px-2',
        )}
      >
        <span aria-hidden className={cn('rounded-full bg-brand text-white font-semibold flex items-center justify-center', compact ? 'w-8 h-8 text-sm' : 'w-[30px] h-[30px] text-sm')}>A</span>
        {!compact && (
          <>
            <span className="text-base font-medium text-primary">Administrator</span>
            <ChevronDown size={16} aria-hidden className="text-secondary" />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Menu akun"
          className={cn(
            'absolute z-50 w-[290px] max-w-[calc(100vw-16px)] bg-surface rounded-md shadow-[0_8px_28px_rgba(36,30,25,0.18)] border border-border overflow-hidden',
            compact ? 'right-2 top-[52px]' : 'right-0 top-[calc(100%+8px)]',
          )}
        >
          <div className="bg-brand text-white p-5 text-center">
            <span aria-hidden className="mx-auto w-[72px] h-[72px] rounded-full bg-white text-green-700 text-[30px] font-semibold flex items-center justify-center">A</span>
            <p className="text-lg font-semibold mt-3">Administrator</p>
            <p className="text-sm opacity-90 mt-0.5">Sesi login berlaku 4 jam</p>
          </div>
          <div className="bg-sunken p-3 flex justify-between gap-2">
            <Button role="menuitem" variant="outline" size="sm" icon={Settings} href="/admin/config" onClick={() => setOpen(false)}>Pengaturan</Button>
            <Button role="menuitem" variant="outline-danger" size="sm" icon={LogOut} onClick={logout}>Keluar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
