export default function Loading() {
  return (
    <div className="max-w-[640px] mx-auto space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#F3F4F6] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-32 bg-[#E5E7EB] rounded" />
          <div className="h-3.5 w-24 bg-[#F3F4F6] rounded" />
        </div>
        <div className="h-8 w-28 bg-[#F3F4F6] rounded-lg" />
      </div>
      <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] px-5 py-4 space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-[#F3F4F6] rounded" />
            <div className="h-3.5 w-20 bg-[#E5E7EB] rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] p-5 space-y-4">
        <div className="h-4 w-40 bg-[#F3F4F6] rounded" />
        <div className="h-11 bg-[#F3F4F6] rounded-xl" />
        <div className="h-11 bg-[#F3F4F6] rounded-xl" />
      </div>
    </div>
  )
}
