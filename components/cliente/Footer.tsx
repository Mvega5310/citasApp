import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Marcos BarberShop';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    // pb-20: el contenido queda por encima del botón flotante de WhatsApp
    <footer className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-20 bg-cafe-bg border-t border-cafe-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6 text-sm text-center md:text-left">
        <span className="font-display text-base text-cafe-goldlight">{APP_NAME}</span>
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
          <span className="text-cafe-subtle text-xs md:text-sm">
            © {year} {APP_NAME}. Todos los derechos reservados.
          </span>
          {/* Acceso discreto para dueños y barberos: con sesión abierta lleva al panel, sin ella al login */}
          <Link
            href="/admin"
            prefetch={false}
            className="inline-flex items-center gap-1.5 min-h-[44px] md:min-h-0 px-2 text-xs font-semibold text-cafe-muted hover:text-cafe-goldlight transition-colors duration-200"
          >
            <LockKeyhole className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" />
            Acceso para el negocio
          </Link>
        </div>
      </div>
    </footer>
  );
}
