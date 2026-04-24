'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Sparkles,
  Menu,
  X,
  LayoutDashboard,
  User,
  Settings,
  ChevronUp,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

type AdminProfile = { name: string; email: string; role?: string };

const navItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard, roles: ['admin', 'viewer'] },
  { href: '/admin/equipo', label: 'Equipo', icon: Users, roles: ['admin'] },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}
    </nav>
  );

  const ProfileSection = ({ onClose }: { onClose?: () => void }) => (
    <div className="px-3 py-3 border-t border-gray-700" ref={dropdownRef}>
      {/* Dropdown menu */}
      {profileOpen && (
        <div className="mb-1 bg-gray-800 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white text-xs font-semibold truncate">{profile.name}</p>
            <p className="text-gray-400 text-xs truncate mt-0.5">{profile.email}</p>
          </div>
          <button
            onClick={() => { setProfileOpen(false); onClose?.(); router.push('/admin/perfil'); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <User className="w-4 h-4 shrink-0" />
            Perfil
          </button>
          <button
            onClick={() => { setProfileOpen(false); onClose?.(); router.push('/admin/configuracion'); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Configuración
          </button>
          <div className="border-t border-gray-700" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Profile trigger button */}
      <button
        onClick={() => setProfileOpen((v) => !v)}
        className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-gray-700 transition-colors group"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
          {initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-white text-sm font-medium truncate leading-tight">{profile.name}</p>
          <p className="text-gray-400 text-xs truncate">{profile.email}</p>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ${
            profileOpen ? '' : 'rotate-180'
          }`}
        />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-gray-900 shrink-0 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm font-serif leading-tight">BeautyTurno</p>
            <p className="text-gray-400 text-xs">Administración</p>
          </div>
        </div>

        <NavLinks />
        <ProfileSection />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm font-serif">BeautyTurno Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-gray-400 hover:text-white p-1"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-14 left-0 bottom-0 w-64 bg-gray-900 flex flex-col"
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
