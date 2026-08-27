export default function Loading() {
  return (
    <div className="max-w-[760px] mx-auto space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#F3F4F6] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-48 bg-[#E5E7EB] rounded" />
          <div className="h-5 w-24 bg-[#F3F4F6] rounded-full" />
        </div>
      </div>
      <div className="h-[92px] bg-white ring-1 ring-[#E5E7EB] rounded-[18px]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-[#E5E7EB] rounded-xl p-3 flex gap-3 bg-white">
          <div className="w-16 h-16 rounded-lg bg-[#F3F4F6] shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 bg-[#F3F4F6] rounded w-3/4" />
            <div className="h-3 bg-[#F3F4F6] rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
