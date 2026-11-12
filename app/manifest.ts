import { MetadataRoute } from 'next';
import { marcaDeLaPagina } from '@/lib/server/marca';

// Lee la barbería de la petición, así que no se puede generar en el build:
// cada subdominio necesita el suyo.
export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { nombre, descripcion } = await marcaDeLaPagina();

  return {
    name: `${nombre} · Reservas`,
    // El nombre bajo el icono en la pantalla de inicio. Android lo recorta
    // alrededor de los 12 caracteres, así que va el nombre solo.
    short_name: nombre,
    description: descripcion,
    start_url: '/',
    display: 'standalone',
    background_color: '#100E0C',
    theme_color: '#100E0C',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es',
    categories: ['lifestyle', 'barbershop'],
    // Por /api/logo y no por el archivo fijo: ese es el logo de UNA barbería,
    // y al instalar la app cada una debe llevar el suyo. La ruta es pública,
    // así que el instalador la alcanza sin sesión igual que al archivo.
    // 'maskable' evita que Android recorte el logo dentro de su propia máscara.
    icons: [
      { src: '/api/logo?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/logo?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/logo?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
