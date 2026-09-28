/**
 * Decorative app mockups rendered as React (not images) — lightweight,
 * crisp at any DPI, and the numbers inside are illustrative (hardcoded on
 * purpose, per the handoff). All `aria-hidden`: they carry no information
 * the surrounding copy doesn't already give.
 *
 * Compositions are laid out at the design's desktop size and scaled down
 * with a transform at smaller breakpoints so proportions stay exact.
 */
import { ChevronLeft, ScanLine, Send } from 'lucide-react'
import type { Visual } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'

/* ── Phone frame ──────────────────────────────────────────────────────────── */
function Phone({ className, screenClass, children }: { className?: string; screenClass?: string; children: React.ReactNode }) {
  return (
    <div className={cn('absolute box-border rounded-[46px] bg-bark-900 p-3 shadow-[0_24px_48px_rgba(36,30,25,0.3)]', className)}>
      <div className={cn('w-full h-full rounded-[36px] bg-page overflow-hidden flex flex-col', screenClass)}>
        {children}
      </div>
    </div>
  )
}

function Notch() {
  return <div className="h-[30px] shrink-0 flex justify-center items-end"><span className="w-[84px] h-1.5 rounded-md bg-bark-900" /></div>
}

function ScreenImage({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
}

/* ── Screens ─────────────────────────────────────────────────────────────── */
function MacroBar({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-11 text-bark-700">{label}</span>
      <span className="relative flex-1 h-1.5 rounded-md bg-sand-100">
        <span className={cn('absolute left-0 top-0 h-1.5 rounded-md', color)} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-[26px] text-right font-semibold text-primary">{value}</span>
    </div>
  )
}

function FoodPhoto({ className }: { className?: string }) {
  const corner = 'absolute w-[22px] h-[22px] border-white'
  return (
    <div className={cn('relative rounded-[18px] bg-sand-200 flex items-center justify-center', className)}>
      <div className="relative w-[136px] h-[136px] rounded-full bg-surface shadow-[0_6px_16px_rgba(36,30,25,0.15)]">
        <div className="absolute left-[22px] top-[26px] w-[62px] h-[62px] rounded-full bg-honey-500" />
        <div className="absolute left-[70px] top-10 w-11 h-[38px] rounded-[20px] bg-tomato-500" />
        <div className="absolute left-11 top-20 w-[52px] h-[30px] rounded-2xl bg-sage-500" />
      </div>
      <span className={cn(corner, 'left-3 top-3 border-l-[3px] border-t-[3px] rounded-tl-lg')} />
      <span className={cn(corner, 'right-3 top-3 border-r-[3px] border-t-[3px] rounded-tr-lg')} />
      <span className={cn(corner, 'left-3 bottom-3 border-l-[3px] border-b-[3px] rounded-bl-lg')} />
      <span className={cn(corner, 'right-3 bottom-3 border-r-[3px] border-b-[3px] rounded-br-lg')} />
    </div>
  )
}

function AnalysisScreen() {
  return (
    <>
      <Notch />
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-primary">
        <ChevronLeft size={18} strokeWidth={2} />
        <span className="text-[15px] font-semibold">Hasil Analisa</span>
      </div>
      <FoodPhoto className="mx-4 mt-1 h-[176px]" />
      <div className="mx-4 mt-3.5 p-3.5 rounded-[14px] bg-surface shadow-hairline">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[16px] font-bold text-primary">Nasi Goreng Ayam</div>
            <div className="text-[11px] text-clay-600 mt-0.5">1 porsi · ±350 g</div>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-extrabold text-green-600 leading-none">420</div>
            <div className="text-[10px] text-clay-600">kkal</div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <MacroBar label="Protein" pct={38} color="bg-tomato-500" value="18g" />
          <MacroBar label="Karbo" pct={72} color="bg-honey-500" value="52g" />
          <MacroBar label="Lemak" pct={30} color="bg-sage-500" value="14g" />
        </div>
      </div>
      <div className="mt-auto mx-4 mb-[18px] h-11 rounded-pill bg-green-600 text-white text-[13px] font-semibold flex items-center justify-center">Simpan ke Riwayat</div>
    </>
  )
}

function HistoryScreen() {
  const bars = [44, 58, 36, 62, 50, 40, 54]
  return (
    <div className="flex flex-col h-full px-3.5">
      <Notch />
      <div className="text-[20px] font-bold text-primary mt-4 mb-3">Riwayat</div>
      <div className="p-3 rounded-[14px] bg-surface shadow-hairline">
        <div className="text-[11px] font-semibold text-clay-600">Ringkasan Nutrisi, Hari Ini</div>
        <div className="mt-2.5 grid grid-cols-4 gap-1 text-center">
          {[
            ['1240', 'KALORI', 'text-green-600'], ['48g', 'PROTEIN', 'text-tomato-500'],
            ['132g', 'KARBO', 'text-honey-500'], ['38g', 'LEMAK', 'text-sage-500'],
          ].map(([v, l, c]) => (
            <div key={l}><div className={cn('text-[14px] font-bold', c)}>{v}</div><div className="text-[9px] text-clay-600">{l}</div></div>
          ))}
        </div>
        <div className="mt-3.5 h-[70px] flex items-end gap-2">
          {bars.map((h, i) => <span key={i} className={cn('flex-1 rounded', i === bars.length - 1 ? 'bg-green-600' : 'bg-green-200')} style={{ height: h }} />)}
        </div>
      </div>
      <div className="mt-3 rounded-[14px] bg-surface shadow-hairline overflow-hidden">
        {[['Nasi Goreng Ayam', 420], ['Salad Buah', 180], ['Telur Rebus', 140]].map(([n, k], i) => (
          <div key={n} className={cn('flex items-center gap-2.5 px-3 py-2.5', i < 2 && 'border-b border-sand-200')}>
            <span className="w-8 h-8 rounded-lg bg-sand-100 shrink-0" />
            <span className="flex-1 text-[12px] font-medium text-primary">{n}</span>
            <span className="text-[12px] font-bold text-primary">{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FloatCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('absolute px-4 py-3 rounded-[14px] bg-surface shadow-[0_8px_24px_rgba(36,30,25,0.14)]', className)}>{children}</div>
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
function HeroDesktop({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div className="absolute left-0 top-0 w-[560px] h-[660px] origin-top-left scale-[0.8] xl:scale-100">
      <div className="absolute left-10 top-10 w-[500px] h-[580px] rounded-[56px] bg-green-600 -rotate-6" />
      <div className="absolute left-[60px] top-[70px] w-[460px] h-[520px] rounded-[48px] bg-green-500 rotate-[4deg] opacity-[0.55]" />
      <Phone className="left-[130px] top-5 w-[300px] h-[620px]">
        {imageUrl ? <ScreenImage url={imageUrl} /> : <AnalysisScreen />}
      </Phone>
      {!imageUrl && (
        <>
          <FloatCard className="left-0 top-[150px] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[10px] bg-green-50 text-green-600 flex items-center justify-center"><ScanLine size={20} strokeWidth={1.8} /></span>
            <span className="flex flex-col"><span className="text-[11px] text-clay-600">Terdeteksi dalam</span><span className="text-[15px] font-bold text-primary">3 detik</span></span>
          </FloatCard>
          <FloatCard className="right-0 top-[440px] flex flex-col gap-1.5">
            <span className="text-[11px] text-clay-600">Hari ini</span>
            <span className="flex gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-[3px] rounded-pill bg-rose-50 text-rose-600">P 48g</span>
              <span className="px-2 py-[3px] rounded-pill bg-honey-50 text-bark-700">K 132g</span>
              <span className="px-2 py-[3px] rounded-pill bg-green-50 text-green-800">L 38g</span>
            </span>
          </FloatCard>
        </>
      )}
    </div>
  )
}

function HeroMobile({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div className="relative w-[350px] h-[500px] max-w-full mx-auto">
      <div className="absolute left-[25px] top-[30px] w-[300px] h-[440px] rounded-[44px] bg-green-600 -rotate-6" />
      <div className="absolute left-[70px] top-0 w-[230px] h-[480px] box-border p-2.5 rounded-[38px] bg-bark-900 shadow-[0_20px_40px_rgba(36,30,25,0.28)]">
        <div className="w-full h-full rounded-[30px] bg-page overflow-hidden flex flex-col text-left">
          {imageUrl ? <ScreenImage url={imageUrl} /> : (
            <>
              <div className="h-6 flex justify-center items-end"><span className="w-16 h-[5px] rounded bg-bark-900" /></div>
              <div className="px-3 pt-2.5 pb-1.5 text-[13px] font-semibold text-primary">Hasil Analisa</div>
              <div className="mx-3 mt-0.5 h-[130px] rounded-[14px] bg-sand-200 flex items-center justify-center">
                <div className="relative w-[100px] h-[100px] rounded-full bg-surface">
                  <div className="absolute left-4 top-5 w-[46px] h-[46px] rounded-full bg-honey-500" />
                  <div className="absolute left-[52px] top-[30px] w-8 h-7 rounded-[14px] bg-tomato-500" />
                  <div className="absolute left-8 top-[60px] w-[38px] h-[22px] rounded-xl bg-sage-500" />
                </div>
              </div>
              <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-surface shadow-hairline">
                <div className="flex justify-between"><span className="text-[13px] font-bold text-primary">Nasi Goreng Ayam</span><span className="text-[18px] font-extrabold text-green-600">420</span></div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {[['38%', 'bg-tomato-500'], ['72%', 'bg-honey-500'], ['30%', 'bg-sage-500']].map(([w, c]) => (
                    <span key={c} className="relative h-[5px] rounded bg-sand-100"><span className={cn('absolute left-0 top-0 h-[5px] rounded', c)} style={{ width: w }} /></span>
                  ))}
                </div>
              </div>
              <div className="mt-auto mx-3 mb-3.5 h-9 rounded-pill bg-green-600 text-white text-[11px] font-semibold flex items-center justify-center">Simpan ke Riwayat</div>
            </>
          )}
        </div>
      </div>
      {!imageUrl && (
        <div className="absolute left-0 top-[330px] px-3 py-2.5 rounded-xl bg-surface shadow-[0_8px_24px_rgba(36,30,25,0.14)] flex flex-col text-left">
          <span className="text-[10px] text-clay-600">Terdeteksi dalam</span>
          <span className="text-[14px] font-bold text-primary">3 detik</span>
        </div>
      )}
    </div>
  )
}

export function HeroVisual({ visual }: { visual: Visual }) {
  const imageUrl = visual.kind === 'image' ? visual.imageUrl : null
  return (
    <div aria-hidden className="shrink-0 select-none">
      <div className="lg:hidden"><HeroMobile imageUrl={imageUrl} /></div>
      <div className="hidden lg:block relative w-[448px] h-[528px] xl:w-[560px] xl:h-[660px]">
        <HeroDesktop imageUrl={imageUrl} />
      </div>
    </div>
  )
}

/* ── Feature row visuals (520 wide) ──────────────────────────────────────── */
function HistoryComposition({ imageUrl }: { imageUrl: string | null }) {
  return (
    <>
      <div className="absolute left-[30px] top-[50px] w-[460px] h-[520px] rounded-full bg-green-100" />
      <Phone className="left-[110px] top-0 w-[300px] h-[620px] shadow-[0_24px_48px_rgba(36,30,25,0.25)]">
        {imageUrl ? <ScreenImage url={imageUrl} /> : <HistoryScreen />}
      </Phone>
    </>
  )
}

function AnalysisComposition({ imageUrl }: { imageUrl: string | null }) {
  return (
    <>
      <div className="absolute left-[30px] top-[50px] w-[460px] h-[520px] rounded-full bg-green-100" />
      <Phone className="left-[110px] top-0 w-[300px] h-[620px] shadow-[0_24px_48px_rgba(36,30,25,0.25)]">
        {imageUrl ? <ScreenImage url={imageUrl} /> : <AnalysisScreen />}
      </Phone>
    </>
  )
}

function TelegramComposition() {
  return (
    <>
      <div className="absolute left-5 top-5 w-[480px] h-[480px] rounded-[48px] bg-green-600 rotate-6" />
      <div className="absolute left-[70px] top-[90px] w-[380px] box-border p-[18px] rounded-[22px] bg-surface shadow-[0_20px_40px_rgba(36,30,25,0.22)]">
        <div className="flex items-center gap-2.5 pb-3 border-b border-sand-200">
          <span className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center"><Send size={18} strokeWidth={2} /></span>
          <div><div className="text-[14px] font-bold text-primary">Gizku Bot</div><div className="text-[11px] text-clay-600">bot</div></div>
        </div>
        <div className="mt-3.5 flex justify-end"><div className="w-[150px] h-[110px] rounded-[14px_14px_4px_14px] bg-sand-200" /></div>
        <div className="mt-2.5 max-w-[260px] px-3.5 py-3 rounded-[14px_14px_14px_4px] bg-green-50 text-[13px] leading-normal text-primary">
          <strong>Soto Ayam</strong> · 312 kkal<br />Protein 24g · Karbo 28g · Lemak 11g<br />
          <span className="text-green-700 font-semibold">Tersimpan ke riwayat</span>
        </div>
      </div>
    </>
  )
}

function ImageComposition({ imageUrl }: { imageUrl: string | null }) {
  return (
    <>
      <div className="absolute left-5 top-5 w-[480px] h-[480px] rounded-[48px] bg-green-100" />
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute left-10 top-10 w-[440px] h-[440px] object-cover rounded-[40px] shadow-[0_20px_40px_rgba(36,30,25,0.22)]" loading="lazy" decoding="async" />
      )}
    </>
  )
}

export function FeatureVisual({ visual }: { visual: Visual }) {
  const tall = visual.kind === 'history' || visual.kind === 'analysis'
  // Box sizes = design size × scale (mobile 0.65, lg 0.8, xl 1).
  const box = tall
    ? 'w-[338px] h-[403px] lg:w-[416px] lg:h-[496px] xl:w-[520px] xl:h-[620px]'
    : 'w-[338px] h-[338px] lg:w-[416px] lg:h-[416px] xl:w-[520px] xl:h-[520px]'
  return (
    <div aria-hidden className={cn('relative shrink-0 select-none max-w-full mx-auto lg:mx-0', box)}>
      <div className={cn(
        'absolute left-0 top-0 w-[520px] origin-top-left scale-[0.65] lg:scale-[0.8] xl:scale-100',
        tall ? 'h-[620px]' : 'h-[520px]',
      )}>
        {visual.kind === 'history' && <HistoryComposition imageUrl={null} />}
        {visual.kind === 'analysis' && <AnalysisComposition imageUrl={null} />}
        {visual.kind === 'telegram' && <TelegramComposition />}
        {visual.kind === 'image' && <ImageComposition imageUrl={visual.imageUrl} />}
      </div>
    </div>
  )
}
