import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marcos BarberShop - Reservas',
    short_name: 'Marcos BarberShop',
    description: 'Reserva tu cita de barbería en Marcos BarberShop de manera fácil y rápida',
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
