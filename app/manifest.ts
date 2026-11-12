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
    // Archivos estáticos y no /api/logo: el instalador de la app los pide sin
    // sesión y a veces antes de que el servidor esté caliente; un archivo
    // suelto no puede fallar. 'maskable' evita que Android recorte el logo
    // dentro de su propia máscara.
    icons: [
      { src: '/icons/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
