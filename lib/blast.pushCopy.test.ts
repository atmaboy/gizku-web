import { describe, expect, it } from 'vitest'
import { pushCopyFor } from './blast'

const blast = { title: 'Judul', body: 'Isi', titleEn: 'Title', bodyEn: 'Body' }

describe('pushCopyFor', () => {
  it('uses English on English devices when the EN copy exists', () => {
    expect(pushCopyFor(blast, 'en')).toEqual({ title: 'Title', body: 'Body' })
  })
  it('falls back to Indonesian when EN is empty or the device is not English', () => {
    expect(pushCopyFor({ ...blast, titleEn: '', bodyEn: '' }, 'en')).toEqual({ title: 'Judul', body: 'Isi' })
    expect(pushCopyFor(blast, 'id')).toEqual({ title: 'Judul', body: 'Isi' })
  })
})
