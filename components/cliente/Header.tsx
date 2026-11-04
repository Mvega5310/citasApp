'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock } from 'lucide-react';
import type { WeekSchedule } from '@/lib/shared/services';
import { useCatalog } from '@/lib/shared/useCatalog';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Marcos BarberShop';

const navLinks = [
  { href: '/', label: 'Inicio', exact: true },
  { href: '/servicios', label: 'Servicios', exact: false },
  { href: '/contacto', label: 'Contacto', exact: false },
];

function getScheduleChip(schedule: WeekSchedule): string {
  const day = new Date().getDay();
  const rule = schedule[day];
  if (!rule || rule.closed) return 'Cerrado hoy';
  return `Hoy · ${rule.start}–${rule.end}`;
}

export default function Header() {
  const pathname = usePathname();
  const { catalog } = useCatalog();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-3 min-h-[44px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/logo?size=64"
              alt={APP_NAME}
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-cafe-border"
            />
            <span className="font-display text-lg font-medium tracking-tight text-cafe-text hidden min-[420px]:block">
              {APP_NAME}
            </span>
          </Link>

          {/* Horario + navegación de escritorio */}
          <div className="flex items-center gap-4">
{catalog && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-cafe-card/70 border border-cafe-border text-cafe-muted">
              <Clock className="w-3.5 h-3.5 text-cafe-gold" width={14} height={14} aria-hidden="true" />
              {getScheduleChip(catalog.schedule)}
            </span>
            )}

            <nav className="hidden md:flex items-center gap-1" aria-label="Principal">
              {navLinks.map(({ href, label, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                      active ? 'text-cafe-goldlight' : 'text-cafe-muted hover:text-cafe-text'
                    }`}
                  >
                    {label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-3 right-3 -bottom-0.5 h-px bg-cafe-gold"
                      />
                    )}
                  </Link>
                );
              })}
              <Link href="/reservar" className="ml-3 btn-primary text-sm py-2 px-5 min-h-[40px]">
                Reservar cita
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
