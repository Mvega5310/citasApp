'use client';

import { useState } from 'react';
import { Mail, Scissors, Loader2, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';

/** Sugiere una dirección a partir del nombre, sin imponerla. */
function sugerirSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    // Después de recortar, no antes: si el corte cae sobre un guión, el
    // servidor rechaza la dirección por terminar en guión.
    .replace(/^-+|-+$/g, '');
}

const VACIO = { name: '', slug: '', adminName: '', adminEmail: '' };

export default function RegistroPage() {
  const [form, setForm] = useState(VACIO);
  const [slugTocado, setSlugTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [dominio] = useState(process.env.NEXT_PUBLIC_APP_DOMAIN ?? '');

  const slugFinal = slugTocado ? form.slug : sugerirSlug(form.name);
  const completo =
    slugFinal.length > 1 && form.name.trim().length > 1 && form.adminName.trim().length > 1 && form.adminEmail.includes('@');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug: slugFinal }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? 'No se pudo enviar el registro');
        return;
      }
      setEnviado(true);
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-cafe-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl shadow-lg mb-4 items-center justify-center bg-cafe-card border border-cafe-border text-cafe-gold">
            <Scissors className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-cafe-text font-display">Registra tu barbería</h1>
          <p className="text-cafe-muted text-sm mt-1">{dominioLabel(dominio)} · 15 días de prueba gratis</p>
        </div>

        <div className="bg-cafe-card rounded-2xl shadow-lg border border-cafe-border p-8">
          {enviado ? (
            <div className="text-center space-y-4">
              <MailCheck className="w-10 h-10 text-cafe-green mx-auto" aria-hidden="true" />
              <p className="text-sm text-cafe-text leading-relaxed">
                Te enviamos un correo a <strong>{form.adminEmail}</strong> para confirmar el registro. Haz clic en el
                enlace y tu barbería queda activa al instante.
              </p>
              <p className="text-xs text-cafe-subtle leading-relaxed">
                Revisa también la carpeta de spam. Si el correo está mal escrito, nada se crea todavía:{' '}
                <button
                  type="button"
                  onClick={() => setEnviado(false)}
                  className="text-cafe-goldlight font-semibold hover:underline"
                >
                  corrígelo e inténtalo de nuevo
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4" noValidate>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-cafe-text mb-1.5">
                  Nombre del negocio
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Barbería del Norte"
                  maxLength={60}
                  autoFocus
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
                />
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
                <p className="mt-1 text-xs text-cafe-subtle">Minúsculas, números y guiones. No podrás cambiarla después.</p>
              </div>

              <div className="border-t border-cafe-border pt-4 space-y-4">
                <div>
                  <label htmlFor="adminName" className="block text-sm font-medium text-cafe-text mb-1.5">
                    Tu nombre
                  </label>
                  <input
                    id="adminName"
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    placeholder="Nombre del dueño o administrador"
                    className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
                  />
                </div>
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-cafe-text mb-1.5">
                    Tu correo
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" aria-hidden="true" />
                    <input
                      id="adminEmail"
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="w-full bg-cafe-soft border border-cafe-border rounded-lg pl-10 pr-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
                    />
                  </div>
                  <p className="mt-1 text-xs text-cafe-subtle">Te mandamos ahí el enlace para confirmar y entrar al panel.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!completo || enviando}
                className="w-full bg-cafe-gold text-cafe-bg font-semibold py-3 rounded-lg hover:bg-cafe-goldlight disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 mt-2"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Crear mi barbería'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-cafe-subtle mt-6">BeautyTurno © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

function dominioLabel(dominio: string): string {
  return dominio ? `tubarberia.${dominio}` : 'tu propio enlace';
}
