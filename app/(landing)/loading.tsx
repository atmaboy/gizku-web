/**
 * Landing page skeleton (shimmer) — shown while the server streams the page
 * (e.g. on a cold cache after "Terbitkan"). Mirrors the real layout so there's
 * no jump when content arrives.
 */
function Bone({ className }: { className: string }) {
  return <div aria-hidden className={`gizku-skeleton ${className}`} />
}

export default function LandingLoading() {
  return (
    <div role="status" aria-label="Memuat halaman" className="bg-page min-h-screen overflow-hidden">
      <div className="h-16 lg:h-20 border-b border-sand-200 flex items-center justify-between px-5 md:px-10 mx-auto max-w-[1280px]">
        <div className="flex items-center gap-2.5"><Bone className="w-8 h-8 lg:w-9 lg:h-9 rounded-[10px]" /><Bone className="w-20 h-6" /></div>
        <div className="hidden lg:flex gap-9">{[0, 1, 2, 3].map(i => <Bone key={i} className="w-16 h-4" />)}</div>
        <Bone className="w-32 h-10 lg:h-11 rounded-pill" />
      </div>
      <div className="mx-auto max-w-[1280px] px-5 md:px-10 pt-9 pb-12 lg:pt-16 lg:pb-[88px] flex flex-col lg:flex-row items-center gap-9 lg:gap-12">
        <div className="flex-1 w-full flex flex-col items-center lg:items-start gap-5">
          <Bone className="w-48 h-8 rounded-pill" />
          <Bone className="w-full max-w-[520px] h-10 lg:h-16" />
          <Bone className="w-4/5 max-w-[420px] h-10 lg:h-16" />
          <Bone className="w-full max-w-[520px] h-5" />
          <Bone className="w-3/4 max-w-[400px] h-5" />
          <div className="w-full lg:w-auto flex flex-col lg:flex-row gap-3 mt-3">
            <Bone className="w-full lg:w-48 h-[54px] lg:h-14 rounded-pill" />
            <Bone className="w-full lg:w-44 h-[54px] lg:h-14 rounded-pill" />
          </div>
        </div>
        <Bone className="w-[300px] h-[440px] lg:w-[448px] lg:h-[528px] xl:w-[560px] xl:h-[660px] rounded-[48px]" />
      </div>
      <div className="h-28 lg:h-36" style={{ background: "var(--green-700)" }} />
      <span className="sr-only">Memuat…</span>
    </div>
  )
}
