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
  admin: 'bg-cafe-gold/15 text-cafe-goldlight',
  viewer: 'bg-cafe-soft text-cafe-muted',
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
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-4 md:px-6 py-4 flex items-center justify-between sticky top-14 md:top-0 z-10 mt-14 md:mt-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cafe-gold/15 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-cafe-goldlight" />
            </div>
            <div>
              <h1 className="text-lg font-display font-medium text-cafe-text leading-tight">Equipo</h1>
              <p className="text-xs text-cafe-subtle">Gestiona los administradores del panel</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-3xl">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm overflow-hidden">
              <div className="divide-y divide-cafe-border">
                {users.map((user) => {
                  const RoleIcon = roleIcon[user.role];
                  const isMe = user.uid === currentUid;
                  return (
                    <div key={user.uid} className="flex items-center justify-between px-6 py-4 hover:bg-cafe-soft transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-cafe-gold flex items-center justify-center text-cafe-bg text-sm font-bold shrink-0">
                          {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-cafe-text">
                            {user.name}
                            {isMe && (
                              <span className="ml-2 text-xs text-cafe-subtle font-normal">(tú)</span>
                            )}
                          </p>
                          <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5">
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
                            className="p-1.5 text-cafe-subtle hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                            title="Eliminar"
                          >
                            {deletingUid === user.uid ? (
                              <div className="w-4 h-4 border-2 border-cafe-border border-t-red-400 rounded-full animate-spin" />
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
                  <div className="flex flex-col items-center justify-center py-16 text-cafe-subtle">
                    <Users className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">No hay administradores registrados</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Roles info */}
          <div className="mt-6 bg-cafe-gold/10 border border-cafe-gold/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-cafe-goldlight mb-2">Tipos de acceso</p>
            <div className="space-y-1.5">
              <p className="text-xs text-cafe-goldlight flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <strong>Administrador</strong> — Acceso completo: panel, configuración y gestión del equipo
              </p>
              <p className="text-xs text-cafe-goldlight flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <strong>Solo lectura</strong> — Solo puede ver las citas del panel
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New admin */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-cafe-card rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-cafe-text">Agregar administrador</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-cafe-subtle hover:text-cafe-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cafe-text mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ej: Laura Martínez"
                  required
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cafe-text mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cafe-text mb-1.5">Rol</label>
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
                            ? 'border-cafe-gold bg-cafe-gold/10 text-cafe-goldlight'
                            : 'border-cafe-border text-cafe-muted hover:border-cafe-border'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {roleLabel[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-cafe-gold/10 border border-cafe-gold/20 rounded-lg mt-1">
                <Mail className="w-4 h-4 text-cafe-goldlight shrink-0 mt-0.5" />
                <p className="text-xs text-cafe-goldlight">
                  Se enviará un correo de invitación al nuevo administrador para que configure su propia contraseña. El enlace expira en 24 horas.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2.5 border border-cafe-border text-cafe-text text-sm font-medium rounded-lg hover:bg-cafe-soft transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-cafe-bg/30 border-t-cafe-bg rounded-full animate-spin" />
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
