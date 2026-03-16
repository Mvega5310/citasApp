import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import WebVitalsClient from '@/components/WebVitalsClient';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeautyTurno - Reserva tu cita de belleza',
  description:
    'Reserva tu cita para servicios de manicure, pedicure, blower y barbería en BeautyTurno. Sistema de reservas online fácil y rápido.',
  keywords: 'beauty, salon, manicure, pedicure, blower, barbería, reservas, citas',
  authors: [{ name: 'BeautyTurno' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BeautyTurno',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://beautyturno.com',
    title: 'BeautyTurno - Reservas de Belleza',
    description: 'Reserva tu cita de belleza y barbería de manera fácil y rápida',
    siteName: 'BeautyTurno',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeautyTurno - Reservas de Belleza',
    description: 'Reserva tu cita de belleza y barbería de manera fácil y rápida',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ec4899',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BeautyTurno" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#ec4899" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        {children}
        <WebVitalsClient />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
