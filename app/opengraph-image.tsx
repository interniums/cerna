import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: 48,
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: '#111111',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#111111', lineHeight: 1.1 }}>Cerna</div>
            <div style={{ fontSize: 24, color: 'rgba(0,0,0,0.6)', marginTop: 8 }}>
              Your calm home base for web resources.
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
