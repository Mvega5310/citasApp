import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marcos BarberShop - Reservas de Belleza',
    short_name: 'Marcos BarberShop',
    description: 'Reserva tu cita de belleza y barbería de manera fácil y rápida',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6b7a5e',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es',
    categories: ['lifestyle', 'beauty'],
    icons: [
      { src: '/api/icon?size=192&color=%236b7a5e&accent=%23d4a853&initial=B', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/api/icon?size=512&color=%236b7a5e&accent=%23d4a853&initial=B', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
