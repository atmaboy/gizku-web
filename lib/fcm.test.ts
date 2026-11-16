import { describe, expect, it } from 'vitest'
import { buildFcmMessage, parseServiceAccount, ANDROID_CHANNEL_ID } from './fcm'

describe('buildFcmMessage', () => {
  it('puts the image on notification + android.notification and stringifies/drops data', () => {
    const { message } = buildFcmMessage({
      token: 'tok', title: 'T', body: 'B', imageUrl: 'https://x.test/a.png',
      data: { notificationId: 'n1', blastId: 'b1', linkType: 'url', linkValue: null },
    })
    expect(message.notification).toEqual({ title: 'T', body: 'B', image: 'https://x.test/a.png' })
    expect(message.android.notification).toEqual({ channel_id: ANDROID_CHANNEL_ID, image: 'https://x.test/a.png' })
    expect(message.android.priority).toBe('HIGH')
    expect(message.data).toEqual({ notificationId: 'n1', blastId: 'b1', linkType: 'url' })
  })
  it('omits image when absent', () => {
    const { message } = buildFcmMessage({ token: 't', title: 'T', body: 'B' })
    expect(message.notification).toEqual({ title: 'T', body: 'B' })
  })
})

describe('parseServiceAccount', () => {
  const sa = { project_id: 'p', client_email: 'e@p.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n' }
  it('accepts raw JSON and base64 JSON', () => {
    const raw = JSON.stringify(sa)
    expect(parseServiceAccount(raw)?.project_id).toBe('p')
    expect(parseServiceAccount(Buffer.from(raw).toString('base64'))?.client_email).toBe(sa.client_email)
    expect(parseServiceAccount(raw)?.private_key).toContain('\nabc\n')
  })
  it('rejects missing or incomplete input', () => {
    expect(parseServiceAccount(undefined)).toBeNull()
    expect(parseServiceAccount('{"project_id":"p"}')).toBeNull()
    expect(parseServiceAccount('nonsense')).toBeNull()
  })
})
