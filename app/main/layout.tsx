'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import CaptureProvider from '@/components/capture/CaptureProvider'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type User = { id: string; username: string }

const BOTTOM_NAV_ROUTES = ['/main/riwayat', '/main/settings']

function AppShellSkeleton() {
  return (
    <div className="max-w-[480px] mx-auto min-h-dvh flex flex-col bg-page">
      <div className="flex-1 flex flex-col gap-3 p-4" style={{ paddingTop: 'calc(58px + env(safe-area-inset-top, 0px))' }}>
        <div className="gizku-skeleton h-6 w-24 mx-auto" />
        <div className="gizku-skeleton h-[120px] rounded-lg mt-4" />
        <div className="gizku-skeleton h-20 rounded-lg" />
        <div className="gizku-skeleton h-20 rounded-lg" />
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()
  const [user, setUser] = useState<User | null>(null)

  const forceLogout = useCallback(() => {
    localStorage.removeItem('nl_token')
    localStorage.removeItem('nl_user')
    localStorage.removeItem('nl_must_change_password')
    router.replace('/login')
  }, [router])

  const initApp = useCallback(async (token: string, userStr: string) => {
    const mustChangeFlagLS = localStorage.getItem('nl_must_change_password')
    let mustChange = mustChangeFlagLS === 'true'

    if (!mustChange) {
      try {
        const parsedUser = JSON.parse(userStr)
        if (parsedUser?.mustChangePassword === true) {
          localStorage.setItem('nl_must_change_password', 'true')
          mustChange = true
        }
      } catch { /* fail-open */ }
    }

    if (mustChange && !pathname.includes('force-change-password')) {
      router.replace('/main/force-change-password')
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    const [todayResult, maintenanceResult] = await Promise.allSettled([
      fetch('/api/history?action=today', { headers, cache: 'no-store' }),
      fetch('/api/maintenance', { headers, cache: 'no-store' }),
    ])

    if (todayResult.status === 'fulfilled' && todayResult.value.status === 401) {
      forceLogout()
      return
    }

    if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value.ok) {
      try {
        const data = await maintenanceResult.value.json()
        if (data?.enabled) {
          localStorage.setItem('nl_maintenance', JSON.stringify({
            title: data.title || t('login.maintenanceDefaultTitle'),
            description: data.description || t('login.maintenanceDefaultDescription'),
          }))
          forceLogout()
          return
        }
      } catch { /* fail-open */ }
    }

    setUser(JSON.parse(userStr))
  }, [forceLogout, pathname, router, t])

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    const u = localStorage.getItem('nl_user')
    if (!token || !u) { router.replace('/login'); return }
    document.documentElement.classList.remove('dark')
    initApp(token, u)
  }, [initApp, router])

  if (!user) return <AppShellSkeleton />

  const showBottomNav = BOTTOM_NAV_ROUTES.includes(pathname)

  return (
    <div className="max-w-[480px] mx-auto min-h-dvh flex flex-col bg-page relative">
      <CaptureProvider>
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
        {showBottomNav && <BottomNav />}
      </CaptureProvider>
    </div>
  )
}
