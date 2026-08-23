import { ImageResponse } from 'next/og'

export const alt = 'Gizku — Analisa Nutrisi Makanan dengan AI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf6ef',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 168,
            height: 168,
            borderRadius: 38,
            background: '#3d7833',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 44,
          }}
        >
          <svg width="100" height="100" viewBox="0 0 200 200" fill="none">
            <path d="M136.8,130.9 A48,48 0 1,1 147.3,91.6" stroke="white" strokeWidth="16" strokeLinecap="round" fill="none" />
            <line x1="132.8" y1="108.8" x2="146.4" y2="112.42" stroke="white" strokeWidth="10" strokeLinecap="round" />
            <path d="M100,100 L100,76 A24,24 0 0,1 120.78,112 Z" fill="#c1603f" />
            <path d="M100,100 L120.78,112 A24,24 0 0,1 79.22,112 Z" fill="#d99b3f" />
            <path d="M100,100 L79.22,112 A24,24 0 0,1 100,76 Z" fill="#6f9b7c" />
          </svg>
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, color: '#241e19', letterSpacing: '-0.02em' }}>
          Gizku
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#4a4038', marginTop: 18 }}>
          Analisa Nutrisi Makanan dengan AI
        </div>
      </div>
    ),
    { ...size }
  )
}
