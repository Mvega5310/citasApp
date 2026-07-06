import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size    = parseInt(searchParams.get('size')    ?? '192', 10);
  const primary = searchParams.get('color')   ?? '#6b7a5e';
  const accent  = searchParams.get('accent')  ?? '#d4a853';
  const initial = (searchParams.get('initial') ?? 'B').charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
          borderRadius: Math.round(size * 0.2),
        }}
      >
        <span style={{ color: 'white', fontSize, fontWeight: 'bold', letterSpacing: '-0.02em' }}>
          {initial}
        </span>
      </div>
    ),
    { width: size, height: size }
  );
}
