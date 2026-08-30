import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import WebVitalsClient from '@/components/shared/WebVitalsClient';
import PWARegister from '@/components/shared/PWARegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marcos BarberShop - Reserva tu cita',
  description:
    'Reserva tu cita de barbería en Marcos BarberShop. Corte, arreglo de barba y más. Sistema de reservas online fácil y rápido.',
  keywords: 'barbería, barber, corte de cabello, afeitado, reservas, citas, Marcos BarberShop',
  authors: [{ name: 'Marcos BarberShop' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Marcos BarberShop',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://beautyturno.com',
    title: 'Marcos BarberShop - Barbería Online',
    description: 'Reserva tu cita de barbería de manera fácil y rápida',
    siteName: 'Marcos BarberShop',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marcos BarberShop - Barbería Online',
    description: 'Reserva tu cita de barbería de manera fácil y rápida',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0E1713',
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Marcos BarberShop" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0E1713" />
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
              background: '#17231D',
              color: '#F1EDE3',
              border: '1px solid #2C3E36',
            },
            success: {
              duration: 3000,
              iconTheme: { primary: '#1FA97C', secondary: '#F1EDE3' },
            },
            error: {
              duration: 4000,
              iconTheme: { primary: '#FF7A66', secondary: '#F1EDE3' },
            },
          }}
        />
      </body>
    </html>
  );
}
