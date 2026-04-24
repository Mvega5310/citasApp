'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import {
  Users, Plus, Trash2, Shield, Eye, Mail, X, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type AdminUser = {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  createdAt: string | null;
};

type NewAdminForm = {
  name: string;
  email: string;
  role: 'admin' | 'viewer';
};

const EMPTY_FORM: NewAdminForm = { name: '', email: '', role: 'viewer' };

const roleLabel = { admin: 'Administrador', viewer: 'Solo lectura' };
const roleIcon = { admin: Shield, viewer: Eye };
const roleColor = {
  admin: 'bg-primary-100 text-primary-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export default function EquipoPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewAdminForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/me'),
      ]);
      const [usersData, meData] = await Promise.all([usersRes.json(), meRes.json()]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentUid(meData.uid ?? null);
    } catch {
      toast.error('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.emailSent) {
          toast.success(`Invitación enviada a ${form.email}`);
        } else {
          toast.success(`${form.name} agregado. Revisa el correo manualmente.`);
        }
        setForm(EMPTY_FORM);
        setShowForm(false);
        fetchUsers();
      } else {
        toast.error(data.error || 'Error al crear el usuario');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uid: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name} del equipo? Esta acción no se puede deshacer.`)) return;
    setDeletingUid(uid);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${name} eliminado`);
        setUsers((prev) => prev.filter((u) => u.uid !== uid));
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeletingUid(null);
    }
  };

  const set = (key: keyof NewAdminForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex min-h-screen bg-gray-50 pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Equipo</h1>
              <p className="text-xs text-gray-400">Gestiona los administradores del panel</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 max-w-3xl">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {users.map((user) => {
                  const RoleIcon = roleIcon[user.role];
                  const isMe = user.uid === currentUid;
                  return (
                    <div key={user.uid} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {user.name}
                            {isMe && (
                              <span className="ml-2 text-xs text-gray-400 font-normal">(tú)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${roleColor[user.role]}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleLabel[user.role]}
                        </span>

                        {!isMe && (
                          <button
                            onClick={() => handleDelete(user.uid, user.name)}
                            disabled={deletingUid === user.uid}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Eliminar"
                          >
                            {deletingUid === user.uid ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {users.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Users className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">No hay administradores registrados</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Roles info */}
          <div className="mt-6 bg-primary-50 border border-primary-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-primary-700 mb-2">Tipos de acceso</p>
            <div className="space-y-1.5">
              <p className="text-xs text-primary-600 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <strong>Administrador</strong> — Acceso completo: panel, configuración y gestión del equipo
              </p>
              <p className="text-xs text-primary-600 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <strong>Solo lectura</strong> — Solo puede ver las citas del panel
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New admin */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Agregar administrador</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ej: Laura Martínez"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['admin', 'viewer'] as const).map((r) => {
                    const Icon = roleIcon[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => set('role', r)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.role === r
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {roleLabel[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-primary-50 border border-primary-100 rounded-lg mt-1">
                <Mail className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <p className="text-xs text-primary-700">
                  Se enviará un correo de invitación al nuevo administrador para que configure su propia contraseña. El enlace expira en 24 horas.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Crear</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
