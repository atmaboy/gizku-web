import { describe, expect, it } from 'vitest'
import { csvCell, waitlistCsv } from '@/lib/goalsCsv'

describe('csv', () => {
  it('escape koma, kutip, dan formula injection', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell(null)).toBe('')
  })
  it('header + baris', () => {
    expect(waitlistCsv([{ username: 'rina', email: 'r@x.com', at: '2026-11-13T01:00:00.000Z', source: 'weekly' }]))
      .toBe('username,email,waktu_remind,source\nrina,r@x.com,2026-11-13T01:00:00.000Z,weekly\n')
  })
})
