import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marcos BarberShop - Reservas',
    short_name: 'Marcos BarberShop',
    description: 'Reserva tu cita de barbería en Marcos BarberShop de manera fácil y rápida',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E1713',
    theme_color: '#0E1713',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es',
    categories: ['lifestyle', 'barbershop'],
    icons: [
      { src: '/api/logo?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/logo?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
