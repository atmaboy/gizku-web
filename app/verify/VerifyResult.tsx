'use client'

import { useRouter } from 'next/navigation'
import GizkuLogo from '@/components/GizkuLogo'
import Button from '@/components/ui/Button'

export type VerifyStatus = 'success' | 'already_verified' | 'expired' | 'error'

type StatusConfig = {
  badgeBg: string
  iconColor: string
  icon: React.ReactNode
  heading: string
  body: string
  primaryLabel: string
  showSecondary: boolean
  secondaryLabel: string
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.8v4.4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon({ color }: { color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="8.5" x2="12" y2="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.15" fill="currentColor" />
    </svg>
  )
}

export default function VerifyResult({ status }: { status: VerifyStatus }) {
  const router = useRouter()

  const configs: Record<VerifyStatus, StatusConfig> = {
    success: {
      badgeBg: 'var(--color-bg-brand-tint)',
      iconColor: 'var(--color-text-brand)',
      icon: <CheckIcon color="var(--color-text-brand)" />,
      heading: 'Email terverifikasi',
      body: 'Akun Gizku kamu siap. Kamu bisa menutup halaman ini dan lanjut di aplikasi.',
      primaryLabel: 'Lanjut ke Gizku',
      showSecondary: false,
      secondaryLabel: '',
    },
    already_verified: {
      badgeBg: 'var(--color-bg-brand-tint)',
      iconColor: 'var(--color-text-brand)',
      icon: <CheckIcon color="var(--color-text-brand)" />,
      heading: 'Email sudah terverifikasi',
      body: 'Email kamu sudah diverifikasi sebelumnya. Tidak ada tindakan lebih lanjut yang diperlukan.',
      primaryLabel: 'Lanjut ke Gizku',
      showSecondary: false,
      secondaryLabel: '',
    },
    expired: {
      badgeBg: 'rgba(217,155,63,0.12)',
      iconColor: 'var(--color-warning)',
      icon: <ClockIcon color="var(--color-warning)" />,
      heading: 'Link kedaluwarsa',
      body: 'Link verifikasi ini sudah kedaluwarsa. Login lalu buka Settings → Email untuk minta link baru.',
      primaryLabel: 'Ke halaman login',
      showSecondary: true,
      secondaryLabel: 'Hubungi support',
    },
    error: {
      badgeBg: 'rgba(194,91,88,0.08)',
      iconColor: 'var(--color-danger)',
      icon: <ErrorIcon color="var(--color-danger)" />,
      heading: 'Verifikasi gagal',
      body: 'Terjadi kesalahan pada sistem kami. Silakan coba lagi beberapa saat lagi.',
      primaryLabel: 'Coba lagi',
      showSecondary: true,
      secondaryLabel: 'Hubungi support',
    },
  }

  const c = configs[status]

  function goPrimary() {
    if (status === 'success' || status === 'already_verified') router.push('/login')
    else if (status === 'error') window.location.reload()
    else router.push('/login')
  }

  function goSecondary() {
    window.location.href = 'mailto:support@gizku.com'
  }

  return (
    <div className="min-h-dvh bg-page flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2 mb-7">
          <GizkuLogo size={44} />
          <div className="text-xl font-semibold text-primary tracking-tight">Gizku</div>
        </div>

        <div
          className="w-full bg-surface rounded-2xl px-8 py-10 box-border flex flex-col items-center text-center"
          style={{ boxShadow: 'var(--shadow-hairline), var(--shadow-sm)' }}
        >
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-5"
            style={{ background: c.badgeBg }}
          >
            {c.icon}
          </div>

          <div className="text-xl font-semibold text-primary mb-2">{c.heading}</div>
          <div className="text-sm text-secondary leading-normal mb-7 max-w-[320px]">{c.body}</div>

          <div className="w-full flex flex-col items-center gap-3.5">
            <Button onClick={goPrimary}>{c.primaryLabel}</Button>
            {c.showSecondary && (
              <a
                href="mailto:support@gizku.com"
                onClick={e => { e.preventDefault(); goSecondary() }}
                className="text-sm font-medium text-link no-underline"
              >
                {c.secondaryLabel}
              </a>
            )}
          </div>
        </div>

        <div className="text-center text-2xs text-tertiary mt-5">© 2026 gizku.com</div>
      </div>
    </div>
  )
}
