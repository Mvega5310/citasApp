import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const size = parseInt(searchParams.get('size') ?? '512', 10);
  const logoUrl = `${origin}/LogoBr.jpg`;

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} width={size} height={size} style={{ objectFit: 'cover' }} />
      </div>
    ),
    { width: size, height: size }
  );
}
