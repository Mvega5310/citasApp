'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock } from 'lucide-react';
import { workingSchedule } from '@/lib/shared/services';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Marcos BarberShop';

const navLinks = [
  { href: '/', label: 'Inicio', exact: true },
  { href: '/servicios', label: 'Servicios', exact: false },
  { href: '/contacto', label: 'Contacto', exact: false },
];

function getScheduleChip(): string {
  const day = new Date().getDay();
  const rule = workingSchedule[day];
  if (!rule || rule.closed) return 'Cerrado hoy';
  return `Hoy · ${rule.start}–${rule.end}`;
}

export default function Header() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: '#0E1713', borderBottom: '1px solid #2C3E36' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/logo?size=64"
              alt={APP_NAME}
              className="w-8 h-8 rounded-xl object-cover shrink-0"
            />
            <span
              className="text-lg font-bold tracking-tight font-display hidden sm:block"
              style={{ color: '#F1EDE3' }}
            >
              {APP_NAME}
            </span>
          </Link>

          {/* Schedule chip + Desktop nav */}
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ background: '#17231D', border: '1px solid #2C3E36', color: '#9FB0A2' }}
            >
              <Clock className="w-3 h-3" />
              {getScheduleChip()}
            </span>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, exact }) => (
                <Link
                  key={href}
                  href={href}
                  className="relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{ color: isActive(href, exact) ? '#E84B85' : '#9FB0A2' }}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/reservar"
                className="ml-2 btn-primary text-sm"
                style={{ paddingTop: '8px', paddingBottom: '8px', paddingLeft: '20px', paddingRight: '20px', minHeight: '36px' }}
              >
                Reservar cita
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
