import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import WebVitalsClient from '@/components/shared/WebVitalsClient';
import PWARegister from '@/components/shared/PWARegister';
import { marcaDeLaPagina } from '@/lib/server/marca';
import './globals.css';

/**
 * Los metadatos son de cada barbería, no de la plataforma.
 *
 * Estaban escritos a mano, así que toda barbería nueva aparecía como "Marcos
 * BarberShop" en la pestaña del navegador, al compartir su enlace por WhatsApp
 * y al instalar la app. Ahora salen del nombre que la barbería configuró.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { nombre, descripcion, ciudad, origen } = await marcaDeLaPagina();
  const titulo = `${nombre} · Reserva tu cita`;

  return {
    // Sin esto, Next resuelve las URLs relativas de Open Graph contra
    // localhost y la vista previa al compartir sale rota en producción.
    metadataBase: new URL(origen),
    title: titulo,
    description: descripcion,
    keywords: ['barbería', 'corte de cabello', 'barba', 'reservas', 'citas', nombre, ciudad]
      .filter(Boolean)
      .join(', '),
    authors: [{ name: nombre }],
    manifest: '/manifest.webmanifest',
    // iOS no lee los iconos del manifest: usa apple-touch-icon. Sin esto, al
    // añadir la app a la pantalla de inicio en iPhone sale un recuadro vacío.
    icons: {
      icon: [{ url: '/icons/logo-192.png', sizes: '192x192', type: 'image/png' }],
      apple: [{ url: '/icons/logo-180.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      // El nombre bajo el icono en la pantalla de inicio del iPhone: ahí no
      // cabe un título largo, así que va solo el nombre.
      title: nombre,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'es_CO',
      url: origen,
      title: titulo,
      description: descripcion,
      siteName: nombre,
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin maximumScale ni userScalable: el usuario debe poder ampliar el contenido
  themeColor: '#100E0C',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/api/logo?size=32" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/api/logo?size=180" />
        {/* apple-mobile-web-app-title lo genera `appleWebApp.title` con el
            nombre de la barbería; escribirlo aquí lo dejaría fijo otra vez. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#100E0C" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        {children}
        <WebVitalsClient />
        <PWARegister />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#201A15',
              color: '#F4EEE5',
              border: '1px solid #403328',
            },
            success: {
              duration: 3000,
              iconTheme: { primary: '#24845E', secondary: '#F4EEE5' },
            },
            error: {
              duration: 4000,
              iconTheme: { primary: '#FF7A66', secondary: '#F4EEE5' },
            },
          }}
        />
      </body>
    </html>
  );
}
