import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import StagingBanner from '@/components/StagingBanner'
import TopLoader from '@/components/ui/TopLoader'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'Gizku',
  description: 'Analisa nutrisi makanan dengan AI',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gizku',
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
      </body>
    </html>
  )
}
