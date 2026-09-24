'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select } from '@/components/admin/ui'

const OPTIONS = [5, 10, 20, 50]

export default function PageSizeSelect({ value, id = 'page-size' }: { value: number; id?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', e.target.value)
    params.set('page', '1')
    document.dispatchEvent(new Event('nav:start'))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-secondary whitespace-nowrap">Tampilkan</label>
      <Select id={id} value={value} onChange={handleChange} className="w-auto min-h-8 py-1 text-sm max-lg:min-h-10 max-lg:text-md">
        {OPTIONS.map(n => (
          <option key={n} value={n}>{n} / halaman</option>
        ))}
      </Select>
    </div>
  )
}
