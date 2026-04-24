'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users } from 'lucide-react';

const items = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/equipo', label: 'Equipo', icon: Users },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              active ? 'text-primary-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-primary-600/30' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
