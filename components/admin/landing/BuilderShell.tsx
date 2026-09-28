'use client'
/**
 * Landing Builder frame shared by /admin/landing, /admin/landing/[section]
 * and /admin/landing/settings:
 *   desktop  — [Susunan Halaman 280px] [form] [pratinjau] + status bar
 *   mobile   — section list → full-screen form, sticky Pratinjau/Terbitkan bar
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Alert, Badge, Button, Code, Modal, Skeleton, TrackedLink } from '@/components/admin/ui'
import { SECTION_ANCHORS, SECTION_LABELS, type BuilderSection, type SectionKey } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { BuilderProvider, useBuilder } from './BuilderContext'
import PreviewPane, { PreviewFrame } from './PreviewPane'
import { GlobalSettingsCard, SectionListDesktop, SectionListMobile, useActiveSection } from './SectionList'
import StatusBar, { MobileActionBar, StatusChip } from './StatusBar'

const CRUMBS = [{ label: 'Halaman Publik' }, { label: 'Landing Page', href: '/admin/landing/hero' }]
const COL_H = 'lg:h-[calc(100vh-var(--staging-banner-h,0px)-232px)] lg:min-h-[640px]'

function SavedNote() {
  const { saveState, savedAt, total } = useBuilder()
  const time = savedAt ? savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
  let dot = 'bg-green-600'
  let text = time ? `Draf tersimpan otomatis · ${time}` : 'Draf tersimpan otomatis'
  if (saveState === 'pending' || saveState === 'saving') { dot = 'bg-honey-500'; text = 'Menyimpan…' }
  else if (saveState === 'error') { dot = 'bg-rose-500'; text = 'Belum tersimpan — coba lagi sebentar' }
  else if (total === 0) text = 'Sama dengan versi tayang'
  return (
    <p className="m-0 flex items-center gap-2 text-sm text-secondary" aria-live="polite">
      <span aria-hidden className={cn('w-2 h-2 rounded-full', dot)} />{text}
    </p>
  )
}

function SectionBadge({ k }: { k: BuilderSection }) {
  const { draft } = useBuilder()
  if (!draft) return null
  if (k === 'header' || k === 'footer') return <Badge variant="light">Selalu tampil</Badge>
  if (!draft.visibility[k as SectionKey]) return <Badge variant="secondary">Disembunyikan</Badge>
  return <Badge variant="soft">Tampil · anchor #{SECTION_ANCHORS[k as SectionKey]}</Badge>
}

function LoadingState() {
  return (
    <AdminPage title="Landing Page" breadcrumb={CRUMBS}>
      <div role="status" aria-label="Memuat Landing Builder" className="flex flex-col gap-4">
        <div className="hidden lg:flex justify-end gap-2"><Skeleton className="h-9 w-72 mr-auto rounded-pill" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(420px,500px)_minmax(0,1fr)] gap-5">
          <div className="hidden lg:flex flex-col gap-2 bg-surface rounded-md shadow-card p-4">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          <div className="flex flex-col gap-4 bg-surface rounded-md shadow-card p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={i % 2 ? 'h-10' : 'h-4 w-32'} />)}</div>
          <Skeleton className="hidden xl:block h-[560px] rounded-md" />
        </div>
      </div>
    </AdminPage>
  )
}

function ErrorState() {
  const { load, reload } = useBuilder()
  if (load.status !== 'error') return null
  return (
    <AdminPage title="Landing Page" breadcrumb={CRUMBS}>
      <Alert variant="danger" title={load.notMigrated ? 'Database belum dimigrasi.' : 'Gagal memuat Landing Builder.'} action={<Button variant="outline" size="sm" onClick={() => void reload()}>Coba lagi</Button>}>
        {load.notMigrated
          ? <>Jalankan <Code>sql/018_create_landing_builder.sql</Code> di Supabase SQL Editor untuk database ini, lalu muat ulang halaman.</>
          : load.message}
      </Alert>
    </AdminPage>
  )
}

function MobilePreviewModal({ open, onClose, highlight }: { open: boolean; onClose: () => void; highlight: BuilderSection | null }) {
  return (
    <Modal open={open} onClose={onClose} title="Pratinjau · Mobile" sheetOnMobile size="lg" bodyClassName="!p-0 h-[70vh] max-lg:h-full">
      <PreviewFrame device="mobile" highlight={highlight} className="h-full" />
    </Modal>
  )
}

function Builder({ children }: { children: React.ReactNode }) {
  const { load } = useBuilder()
  const active = useActiveSection()
  const router = useRouter()
  const { flush } = useBuilder()
  const [previewOpen, setPreviewOpen] = useState(false)

  // /admin/landing → first section on desktop; the list itself on mobile.
  useEffect(() => {
    if (active === null && window.matchMedia('(min-width: 1024px)').matches) router.replace('/admin/landing/hero')
  }, [active, router])

  if (load.status === 'loading') return <LoadingState />
  if (load.status === 'error') return <ErrorState />

  if (active === 'settings') {
    return (
      <AdminPage title="Pengaturan Global Landing" breadcrumb={[...CRUMBS, { label: 'Pengaturan global' }]}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip className="mr-auto" />
          <Button variant="outline" icon={ArrowLeft} href="/admin/landing/hero">Kembali ke builder</Button>
          <Button icon={Save} onClick={() => void flush()}>Simpan ke draf</Button>
        </div>
        {children}
        <div className="lg:hidden h-20" aria-hidden />
        <MobileActionBar onPreview={() => setPreviewOpen(true)} />
        <MobilePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} highlight={null} />
      </AdminPage>
    )
  }

  if (active === null) {
    return (
      <AdminPage title="Landing Page" breadcrumb={CRUMBS}>
        <StatusChip className="self-start" />
        <SectionListMobile />
        <div className="h-20" aria-hidden />
        <MobileActionBar onPreview={() => setPreviewOpen(true)} />
        <MobilePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} highlight={null} />
      </AdminPage>
    )
  }

  return (
    <AdminPage title="Landing Page" breadcrumb={CRUMBS}>
      <StatusBar />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(420px,500px)_minmax(0,1fr)] gap-5 items-start">
        {/* Susunan Halaman */}
        <aside className={cn('hidden lg:flex flex-col bg-surface rounded-md shadow-card overflow-hidden', COL_H)}>
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <h2 className="text-md font-semibold text-primary">Susunan Halaman</h2>
            <p className="text-sm text-secondary mt-0.5">Seret untuk mengubah urutan. Klik untuk mengedit.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2"><SectionListDesktop /></div>
          <div className="p-2 border-t border-border"><GlobalSettingsCard /></div>
        </aside>

        {/* Form */}
        <section aria-labelledby="lb-form-title" className={cn('bg-surface rounded-md shadow-card flex flex-col min-w-0 overflow-hidden', COL_H)}>
          <div className="min-h-[56px] px-4 py-2 border-b border-border flex items-center gap-3">
            <TrackedLink href="/admin/landing" className="lg:hidden -ml-1 w-10 h-10 inline-flex items-center justify-center rounded-sm text-secondary hover:bg-muted" aria-label="Kembali ke susunan halaman">
              <ArrowLeft size={20} aria-hidden />
            </TrackedLink>
            <h2 id="lb-form-title" className="text-lg font-semibold text-primary flex-1 min-w-0 truncate">{SECTION_LABELS[active]}</h2>
            <SectionBadge k={active} />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-5">{children}</div>
          <div className="px-4 py-3 border-t border-border bg-surface max-lg:pb-24"><SavedNote /></div>
        </section>

        {/* Pratinjau */}
        <div className={cn('hidden xl:block', COL_H)}><PreviewPane highlight={active} /></div>
      </div>
      <div className="xl:hidden max-lg:hidden flex justify-end">
        <Button variant="outline" onClick={() => setPreviewOpen(true)}>Tampilkan pratinjau</Button>
      </div>
      <MobileActionBar onPreview={() => setPreviewOpen(true)} />
      <MobilePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} highlight={active} />
    </AdminPage>
  )
}

export default function BuilderShell({ children }: { children: React.ReactNode }) {
  return (
    <BuilderProvider>
      <Builder>{children}</Builder>
    </BuilderProvider>
  )
}
