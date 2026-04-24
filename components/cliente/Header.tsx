'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Inicio', exact: true },
  { href: '/servicios', label: 'Servicios', exact: false },
  { href: '/contacto', label: 'Contacto', exact: false },
];

export default function Header() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 font-serif">BeautyTurno</span>
          </Link>

          {/* Desktop Navigation only */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ href, label, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </Link>
              );
            })}
            <Link
              href="/reservar"
              className={`ml-3 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${
                isActive('/reservar', false)
                  ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300'
                  : 'bg-primary-500 hover:bg-primary-600 text-white hover:shadow-md'
              }`}
            >
              Reservar cita
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
