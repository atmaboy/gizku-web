export default function Loading() {
  return (
    <div className="max-w-[640px] mx-auto space-y-5 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-28 bg-[#E5E7EB] rounded-lg" />
        <div className="h-4 w-64 bg-[#F3F4F6] rounded-md" />
      </div>
      <div className="h-[68px] bg-white ring-1 ring-[#E5E7EB] rounded-[18px]" />
    </div>
  )
}
