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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: '#0E1713',
        borderTop: '1px solid #2C3E36',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-200 touch-manipulation"
              style={{ color: active ? '#E84B85' : '#7C8F81' }}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#E84B85' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
