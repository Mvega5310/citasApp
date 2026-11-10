'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCatalog } from '@/lib/shared/useCatalog';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  User,
  Settings,
  ChevronUp,
  Users,
  Clock,
  Scissors,
} from 'lucide-react';
import toast from 'react-hot-toast';

type AdminProfile = { name: string; email: string; role?: string };

const navItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard, roles: ['admin', 'viewer'] },
  { href: '/admin/horarios', label: 'Horarios', icon: Clock, roles: ['admin'] },
  { href: '/admin/servicios', label: 'Servicios', icon: Scissors, roles: ['admin'] },
  { href: '/admin/equipo', label: 'Equipo', icon: Users, roles: ['admin'] },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // Del catálogo, que es por barbería: la variable de compilación es la misma
  // para todo el despliegue y mostraría el nombre de otra barbería.
  const { catalog } = useCatalog();
  const tenantName = catalog?.salonName ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile>({ name: 'Administrador', email: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setProfile({ name: d.name ?? 'Admin', email: d.email ?? '', role: d.role }))
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    toast.success('Sesión cerrada');
    router.push('/admin/login');
  };

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isActive = (href: string) => pathname === href;

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems
        .filter(({ roles }) => !profile.role || roles.includes(profile.role))
        .map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isActive(href)
                ? 'bg-cafe-gold/15 text-cafe-goldlight ring-1 ring-inset ring-cafe-gold/30'
                : 'text-cafe-muted hover:bg-cafe-hover hover:text-cafe-text'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}
    </nav>
  );

  const ProfileSection = ({ onClose }: { onClose?: () => void }) => (
    <div className="px-3 py-3 border-t border-cafe-border" ref={dropdownRef}>
      {/* Dropdown menu */}
      {profileOpen && (
        <div className="mb-1 bg-cafe-card rounded-xl overflow-hidden shadow-lg shadow-black/40 ring-1 ring-cafe-border">
          <div className="px-4 py-3 border-b border-cafe-border">
            <p className="text-cafe-text text-xs font-semibold truncate">{profile.name}</p>
            <p className="text-cafe-muted text-xs truncate mt-0.5">{profile.email}</p>
          </div>
          <button
            onClick={() => { setProfileOpen(false); onClose?.(); router.push('/admin/perfil'); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-cafe-muted hover:bg-cafe-hover hover:text-cafe-text transition-colors"
          >
            <User className="w-4 h-4 shrink-0" />
            Perfil
          </button>
          <button
            onClick={() => { setProfileOpen(false); onClose?.(); router.push('/admin/configuracion'); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-cafe-muted hover:bg-cafe-hover hover:text-cafe-text transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Configuración
          </button>
          <div className="border-t border-cafe-border" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Profile trigger button */}
      <button
        onClick={() => setProfileOpen((v) => !v)}
        className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-cafe-hover transition-colors group"
      >
        <div className="w-9 h-9 rounded-full bg-cafe-gold flex items-center justify-center text-cafe-bg text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-cafe-text text-sm font-medium truncate leading-tight">{profile.name}</p>
          <p className="text-cafe-muted text-xs truncate">{profile.email}</p>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-cafe-subtle group-hover:text-cafe-text transition-transform duration-200 ${
            profileOpen ? '' : 'rotate-180'
          }`}
        />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-cafe-soft border-r border-cafe-border shrink-0 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-cafe-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/logo?size=72"
            alt={tenantName}
            className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-cafe-border"
          />
          <div>
            <p className="text-cafe-text font-medium text-base font-display leading-tight">{tenantName}</p>
            <p className="text-cafe-gold text-[11px] font-semibold uppercase tracking-[0.2em] mt-0.5">Administración</p>
          </div>
        </div>

        <NavLinks />
        <ProfileSection />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-cafe-bg/95 backdrop-blur-md border-b border-cafe-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/logo?size=56"
            alt={tenantName}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-cafe-border"
          />
          <span className="text-cafe-text font-medium text-sm font-display">{tenantName} Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          className="text-cafe-muted hover:text-cafe-text p-2 -mr-1 rounded-lg"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-14 left-0 bottom-0 w-64 bg-cafe-soft border-r border-cafe-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavLinks onClose={() => setMobileOpen(false)} />
            <ProfileSection onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
