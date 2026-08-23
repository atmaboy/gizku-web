import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import StagingBanner from '@/components/StagingBanner'
import TopLoader from '@/components/ui/TopLoader'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gizku.com'
const IS_PRODUCTION = (process.env.NEXT_PUBLIC_APP_ENV ?? 'production') === 'production'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Gizku — Analisa Nutrisi Makanan dengan AI',
    template: '%s · Gizku',
  },
  description: 'Cukup foto makananmu — Gizku langsung kenali isinya dan hitung kalori, protein, lemak, dan karbohidrat secara otomatis. Gratis, tanpa perlu mencatat manual.',
  keywords: [
    'Gizku', 'kalkulator kalori', 'hitung kalori makanan', 'analisa nutrisi AI',
    'aplikasi diet', 'pencatat makanan', 'foto makanan hitung kalori', 'nutrition tracker Indonesia',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gizku',
  },
  openGraph: {
    siteName: 'Gizku',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: IS_PRODUCTION,
    follow: IS_PRODUCTION,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#3d7833',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* DNS prefetch + preconnect untuk Google Fonts CDN */}
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Ensure always light mode — no dark class */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){ document.documentElement.classList.remove('dark'); })();`,
          }}
        />

        {/* Patch history.pushState/replaceState before Next's router bundle loads and
            captures its own reference — a patch applied later (e.g. in a useEffect)
            would run after that capture and never see real navigations. Dispatches a
            DOM event TopLoader listens for to show a progress bar during transitions. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              if (window.__gizkuNavPatched) return;
              window.__gizkuNavPatched = true;
              var push = window.history.pushState.bind(window.history);
              var replace = window.history.replaceState.bind(window.history);
              window.history.pushState = function() {
                window.dispatchEvent(new Event('gizku:nav-start'));
                return push.apply(null, arguments);
              };
              window.history.replaceState = function() {
                window.dispatchEvent(new Event('gizku:nav-start'));
                return replace.apply(null, arguments);
              };
            })();`,
          }}
        />
      </head>
      <body style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <LanguageProvider>
          <TopLoader />
          <StagingBanner />
          {children}
          <Toaster
            richColors
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: 'var(--radius-lg)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
              },
            }}
          />
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
