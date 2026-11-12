import { NextResponse } from 'next/server';
import { marcaDeLaPagina } from '@/lib/server/marca';

/**
 * Manifest del panel, por barbería.
 *
 * Era un archivo fijo en `public/`, así que cualquier dueño que instalara el
 * panel en su teléfono veía "Marcos BarberShop Admin" bajo el icono. Un
 * archivo estático no puede saber de quién es la petición; una ruta sí.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const { nombre } = await marcaDeLaPagina();

  return NextResponse.json(
    {
      name: `${nombre} · Panel`,
      // Android recorta el nombre bajo el icono alrededor de los 12
      // caracteres. "Panel" solo sería ambiguo si tiene varias barberías
      // instaladas, así que manda el nombre y se recorta si es largo.
      short_name: nombre,
      description: `Panel de administración de ${nombre}`,
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      background_color: '#0E1713',
      theme_color: '#0E1713',
      orientation: 'portrait-primary',
      lang: 'es',
      icons: [
        { src: '/api/logo?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/api/logo?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
