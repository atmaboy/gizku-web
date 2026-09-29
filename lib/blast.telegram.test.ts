import { describe, expect, it } from 'vitest'
import type { Api } from 'grammy'
import { splitTelegramBody } from './blastContent'
import { sendTelegramBlastMessage } from './blast'

const A = 'https://x.test/a.png'
const B = 'https://x.test/b.png'

function fakeApi() {
  const calls: { method: string; args: unknown[] }[] = []
  let id = 100
  const photo = (fid: string) => ({ photo: [{ file_id: `${fid}_s` }, { file_id: `${fid}_l` }] })
  const api = {
    sendMessage: async (...args: unknown[]) => { calls.push({ method: 'sendMessage', args }); return { message_id: ++id } },
    sendPhoto: async (...args: unknown[]) => { calls.push({ method: 'sendPhoto', args }); return { message_id: ++id, ...photo('p') } },
    sendMediaGroup: async (...args: unknown[]) => {
      calls.push({ method: 'sendMediaGroup', args })
      return (args[1] as unknown[]).map((_, i) => ({ message_id: ++id, ...photo(`g${i}`) }))
    },
  }
  return { api: api as unknown as Api, calls }
}

describe('sendTelegramBlastMessage', () => {
  it('text only → sendMessage', async () => {
    const { api, calls } = fakeApi()
    await sendTelegramBlastMessage(api, '1', splitTelegramBody('Halo'), [])
    expect(calls).toEqual([{ method: 'sendMessage', args: ['1', 'Halo'] }])
  })

  it('one image → sendPhoto with caption, then reuses file_id', async () => {
    const { api, calls } = fakeApi()
    const content = splitTelegramBody(`Promo\n![](${A})`)
    const ids: (string | null)[] = [null]
    await sendTelegramBlastMessage(api, '1', content, ids)
    await sendTelegramBlastMessage(api, '2', content, ids)
    expect(calls[0]).toEqual({ method: 'sendPhoto', args: ['1', A, { caption: 'Promo' }] })
    expect(calls[1]).toEqual({ method: 'sendPhoto', args: ['2', 'p_l', { caption: 'Promo' }] })
  })

  it('image without text → no caption', async () => {
    const { api, calls } = fakeApi()
    await sendTelegramBlastMessage(api, '1', splitTelegramBody(`![](${A})`), [null])
    expect(calls[0]).toEqual({ method: 'sendPhoto', args: ['1', A, undefined] })
  })

  it('two images → album, caption on the first, first message id tracked', async () => {
    const { api, calls } = fakeApi()
    const r = await sendTelegramBlastMessage(api, '1', splitTelegramBody(`![](${A})\n![](${B})\nHalo`), [null, null])
    expect(calls[0].method).toBe('sendMediaGroup')
    expect(calls[0].args[1]).toEqual([
      { type: 'photo', media: A, caption: 'Halo' },
      { type: 'photo', media: B },
    ])
    expect(r.message_id).toBe(101)
  })
})
