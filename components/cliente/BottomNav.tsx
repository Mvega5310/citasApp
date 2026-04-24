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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          const isReservar = href === '/reservar';
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isReservar
                  ? active
                    ? 'text-white bg-primary-600'
                    : 'text-white bg-primary-500'
                  : active
                  ? 'text-primary-600'
                  : 'text-gray-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isReservar ? '' : active ? 'stroke-[2.5]' : ''}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
