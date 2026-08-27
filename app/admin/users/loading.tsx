// app/admin/users/loading.tsx — shimmer untuk halaman User
export default function Loading() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-44 bg-[#E5E7EB] rounded-lg" />
        <div className="h-4 w-48 bg-[#F3F4F6] rounded-md" />
      </div>
      <div className="hidden md:block bg-white ring-1 ring-[#E5E7EB] rounded-[18px] overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex gap-6">
          {[100, 160, 120, 100, 140].map((w, i) => (
            <div key={i} className="h-3 bg-[#E5E7EB] rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`px-4 py-3 flex gap-6 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
            {[100, 160, 120, 100, 140].map((w, j) => (
              <div key={j} className="h-4 bg-[#F3F4F6] rounded" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#F3F4F6]" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-28 bg-[#E5E7EB] rounded" />
                <div className="h-3 w-36 bg-[#F3F4F6] rounded" />
              </div>
            </div>
            <div className="h-10 bg-[#F3F4F6] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
