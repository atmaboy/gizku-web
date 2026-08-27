'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const OPTIONS = [5, 10, 20, 50]

export default function PageSizeSelect({ value }: { value: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', e.target.value)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="text-xs border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
      aria-label="Jumlah baris per halaman"
    >
      {OPTIONS.map(n => (
        <option key={n} value={n}>{n} / halaman</option>
      ))}
    </select>
  )
}
