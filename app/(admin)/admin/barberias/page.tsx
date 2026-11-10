'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { Building2, Plus, ExternalLink, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type Tenant = {
  slug: string;
  name: string;
  status: string;
  admins: number;
  createdAt: string | null;
};

const VACIO = { slug: '', name: '', adminName: '', adminEmail: '' };

/** Sugiere una dirección a partir del nombre, sin imponerla. */
function sugerirSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function BarberiasPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cargando, setCargando] = useState(true);
  const [permitido, setPermitido] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [slugTocado, setSlugTocado] = useState(false);
  const [creando, setCreando] = useState(false);
  const [dominio, setDominio] = useState('');

  useEffect(() => {
    setDominio(process.env.NEXT_PUBLIC_APP_DOMAIN ?? '');
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.status === 403) {
        setPermitido(false);
        return;
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'No se pudieron cargar');
      setTenants(body.tenants ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron cargar las barberías');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? 'No se pudo crear');
        return;
      }
      toast.success(
        body.emailSent
          ? `"${form.name}" creada. Le llegó el enlace de acceso a ${form.adminEmail}.`
          : `"${form.name}" creada, pero el correo de acceso no salió. Reenvíalo desde Equipo.`
      );
      setForm(VACIO);
      setSlugTocado(false);
      cargar();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setCreando(false);
    }
  };

  const slugFinal = slugTocado ? form.slug : sugerirSlug(form.name);
  const completo =
    slugFinal.length > 1 && form.name.trim().length > 1 && form.adminName.trim().length > 1 && form.adminEmail.includes('@');

  if (!permitido) {
    return (
      <div className="flex min-h-screen bg-cafe-bg text-cafe-text">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <p className="text-cafe-muted">Esta sección es solo para quien administra la plataforma.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-4 md:px-6 py-4 flex items-center gap-3 sticky top-14 md:top-0 z-10 mt-14 md:mt-0">
          <div className="w-9 h-9 bg-cafe-gold/15 rounded-lg flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-cafe-goldlight" />
          </div>
          <div>
            <h1 className="text-lg font-display font-medium text-cafe-text leading-tight">Barberías</h1>
            <p className="text-xs text-cafe-subtle">Da de alta negocios en la plataforma</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-3xl space-y-6">
          <form onSubmit={crear} className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6">
            <h2 className="text-base font-semibold text-cafe-text mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cafe-goldlight" />
              Nueva barbería
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-cafe-text mb-1.5">
                  Nombre del negocio
                </label>
                <input
                  id="nombre"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Barbería del Norte"
                  maxLength={60}
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
                />
                <p className="mt-1 text-xs text-cafe-subtle">
                  Es lo que verán sus clientes hasta que lo cambien en su Configuración.
                </p>
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-cafe-text mb-1.5">
                  Dirección
                </label>
                <div className="flex items-center gap-0 rounded-lg border border-cafe-border bg-cafe-soft focus-within:ring-2 focus-within:ring-cafe-gold/50 transition">
                  <input
                    id="slug"
                    value={slugFinal}
                    onChange={(e) => {
                      setSlugTocado(true);
                      setForm({ ...form, slug: e.target.value.toLowerCase() });
                    }}
                    placeholder="barberia-del-norte"
                    className="flex-1 min-w-0 bg-transparent px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none"
                  />
                  <span className="px-3 text-xs text-cafe-subtle font-mono shrink-0 border-l border-cafe-border py-2.5">
                    .{dominio || 'citas.proyects.store'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-cafe-subtle">
                  Minúsculas, números y guiones. No se puede cambiar después sin romper los enlaces ya repartidos.
                </p>
              </div>

              <div className="border-t border-cafe-border pt-4">
                <p className="text-sm font-medium text-cafe-text mb-3">Quién la administra</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    placeholder="Nombre del dueño"
                    aria-label="Nombre del administrador"
                    className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
                  />
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    aria-label="Correo del administrador"
                    className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
                  />
                </div>
                <p className="mt-2 text-xs text-cafe-subtle">
                  Recibirá un enlace para crear su contraseña, válido 72 horas.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={!completo || creando}
                className="flex items-center gap-2 px-6 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {creando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cafe-bg/30 border-t-cafe-bg rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear barbería
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6">
            <h2 className="text-base font-semibold text-cafe-text mb-4">
              En la plataforma{tenants.length > 0 && ` · ${tenants.length}`}
            </h2>

            {cargando ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
              </div>
            ) : tenants.length === 0 ? (
              <p className="text-sm text-cafe-muted">Todavía no hay ninguna.</p>
            ) : (
              <ul className="divide-y divide-cafe-border">
                {tenants.map((t) => (
                  <li key={t.slug} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-cafe-text truncate">{t.name || t.slug}</p>
                      <p className="text-xs text-cafe-subtle font-mono truncate">
                        {t.slug}.{dominio || 'citas.proyects.store'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-cafe-muted">
                        {t.admins} {t.admins === 1 ? 'admin' : 'admins'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                          t.status === 'active'
                            ? 'text-cafe-green bg-cafe-green/10'
                            : 'text-cafe-muted bg-cafe-soft'
                        }`}
                      >
                        {t.status === 'active' && <Check className="w-3 h-3" />}
                        {t.status}
                      </span>
                      <a
                        href={`https://${t.slug}.${dominio || 'citas.proyects.store'}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${t.name || t.slug}`}
                        className="text-cafe-muted hover:text-cafe-goldlight transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
