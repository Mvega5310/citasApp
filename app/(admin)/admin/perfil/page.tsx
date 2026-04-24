'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { User, Mail, Save, KeyRound, CheckCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PerfilPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => { setName(d.name || ''); setEmail(d.email || ''); })
      .catch(() => toast.error('Error al cargar el perfil'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        setSaved(true);
        toast.success('Perfil actualizado');
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50 pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — siempre visible al hacer scroll */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow"
          >
            {loading ? <User className="w-5 h-5" /> : (initials || <User className="w-5 h-5" />)}
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              {loading ? 'Cargando...' : (name || 'Mi Perfil')}
            </h1>
            <p className="text-xs text-gray-400">{email}</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Edit name */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-500" />
                  Información personal
                </h2>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre de display
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Este nombre aparece en el sidebar y el encabezado del panel.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full border border-gray-200 rounded-lg pl-10 pr-28 py-2.5 text-gray-400 bg-gray-50 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        Solo lectura
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saved ? (
                      <><CheckCircle className="w-4 h-4" /> Guardado</>
                    ) : saving ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Guardar cambios</>
                    )}
                  </button>
                </form>
              </div>

              {/* Password section */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary-500" />
                  Seguridad
                </h2>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Contraseña</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Para cambiar la contraseña, comunícate con el soporte técnico.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
