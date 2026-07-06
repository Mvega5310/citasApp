import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import WebVitalsClient from '@/components/shared/WebVitalsClient';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeautyTurno - Reserva tu cita de belleza',
  description:
    'Reserva tu cita para servicios de manicure, pedicure, blower y barbería en BeautyTurno. Sistema de reservas online fácil y rápido.',
  keywords: 'beauty, salon, manicure, pedicure, blower, barbería, reservas, citas',
  authors: [{ name: 'BeautyTurno' }],
  manifest: '/manifest.webmanifest',
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
        <link
          rel="apple-touch-icon"
          href="/api/icon?size=192&color=%236b7a5e&accent=%23E84B85&initial=B"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BeautyTurno" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0E1713" />
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
