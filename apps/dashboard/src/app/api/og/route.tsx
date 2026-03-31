import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
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
          background: 'linear-gradient(135deg, #030303 0%, #1a0000 50%, #030303 100%)',
          position: 'relative',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.05,
            backgroundImage:
              'linear-gradient(rgba(220,38,38,1) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Classification header */}
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            fontFamily: 'monospace',
            letterSpacing: '6px',
            color: '#dc2626',
            marginBottom: 40,
            opacity: 0.8,
          }}
        >
          ▓▓▓ OPEN SOURCE INTELLIGENCE ▓▓▓
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 700,
            color: '#fafafa',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          PROJECT TRUTH
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#a3a3a3',
            fontFamily: 'sans-serif',
            marginTop: 24,
            textAlign: 'center',
            maxWidth: 600,
          }}
        >
          3D Network Visualization for Investigative Journalism
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            gap: 30,
            fontSize: 14,
            fontFamily: 'monospace',
            color: '#737373',
            letterSpacing: '2px',
          }}
        >
          <span>AGPL-3.0</span>
          <span>•</span>
          <span>OPEN SOURCE</span>
          <span>•</span>
          <span>COMMUNITY DRIVEN</span>
        </div>

        {/* Red accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#dc2626',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
