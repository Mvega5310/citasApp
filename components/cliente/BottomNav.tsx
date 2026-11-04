'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Scissors, MessageCircle, CalendarPlus } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home, exact: true },
  { href: '/servicios', label: 'Servicios', icon: Scissors, exact: false },
  { href: '/contacto', label: 'Contacto', icon: MessageCircle, exact: false },
  { href: '/reservar', label: 'Reservar', icon: CalendarPlus, exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      aria-label="Navegación inferior"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-cafe-bg/95 backdrop-blur-md border-t border-cafe-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-200 touch-manipulation ${
                active ? 'text-cafe-goldlight' : 'text-cafe-muted hover:text-cafe-text'
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cafe-gold"
                />
              )}
              <Icon className="w-5 h-5" width={20} height={20} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
