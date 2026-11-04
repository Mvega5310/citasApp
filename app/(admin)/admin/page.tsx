'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { Appointment } from '@/types';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  X,
  Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/30',
  confirmed: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/30',
  completed: 'bg-sky-400/10 text-sky-300 ring-1 ring-inset ring-sky-400/30',
  cancelled: 'bg-red-400/10 text-red-300 ring-1 ring-inset ring-red-400/30',
};
const STATUS_FALLBACK = 'bg-cafe-soft text-cafe-muted ring-1 ring-inset ring-cafe-border';

// Estilos reutilizados en la vista (solo presentación)
const selectCls =
  'text-xs bg-cafe-soft text-cafe-text border border-cafe-border rounded-lg px-2 py-1.5 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50';
const checkboxCls = 'w-4 h-4 rounded accent-cafe-gold cursor-pointer';
const iconBtnCls = 'p-1.5 rounded-lg transition-colors';

export default function AdminPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDate, setFilterDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // allAppointments holds the full unfiltered dataset
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  const fetchAppointments = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/admin/appointments');
      if (res.status === 401) { router.push('/admin/login'); return; }

      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error || 'Error al cargar las citas';
        toast.error(msg);
        return;
      }

      const data = await res.json();
      setAllAppointments(data.rows ?? []);
      setTotal(data.count ?? 0);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  // Filter client-side — no extra API calls, stats always accurate
  useEffect(() => {
    let filtered = allAppointments;
    if (filterStatus !== 'all') filtered = filtered.filter((a) => a.status === filterStatus);
    if (filterDate) filtered = filtered.filter((a) => a.date === filterDate);
    setAppointments(filtered);
  }, [allAppointments, filterStatus, filterDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleStatusSave = async (id: string) => {
    if (!editStatus) return;
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus }),
      });
      if (res.ok) {
        setAllAppointments((prev) =>
          prev.map((apt) =>
            apt.id === id ? { ...apt, status: editStatus as Appointment['status'], updatedAt: new Date() } : apt
          )
        );
        setEditingId(null);
        toast.success('Estado actualizado');
      } else {
        toast.error('Error al actualizar');
      }
    } catch { toast.error('Error de conexión'); }
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (!confirm(`¿Eliminar la cita de ${clientName}?`)) return;
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAllAppointments((prev) => prev.filter((apt) => apt.id !== id));
        setTotal((t) => t - 1);
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        toast.success('Cita eliminada');
      } else {
        toast.error('Error al eliminar');
      }
    } catch { toast.error('Error de conexión'); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} cita${ids.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
        if (res.ok) deleted++;
      } catch {}
    }
    setAllAppointments((prev) => prev.filter((apt) => !selectedIds.has(apt.id)));
    setTotal((t) => t - deleted);
    setSelectedIds(new Set());
    setBulkDeleting(false);
    toast.success(`${deleted} cita${deleted !== 1 ? 's' : ''} eliminada${deleted !== 1 ? 's' : ''}`);
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.size === appointments.length && appointments.length > 0
      ? new Set()
      : new Set(appointments.map((a) => a.id))
    );

  const allSelected = appointments.length > 0 && selectedIds.size === appointments.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  // Stats always computed from full dataset, not filtered view
  const stats = {
    total: allAppointments.length,
    pending: allAppointments.filter((a) => a.status === 'pending').length,
    confirmed: allAppointments.filter((a) => a.status === 'confirmed').length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
  };

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-6 lg:px-8 py-5 md:flex items-center justify-between hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cafe-gold mb-1">
              Administración
            </p>
            <h1 className="text-2xl font-medium text-cafe-text font-display">Panel</h1>
            <p className="text-sm text-cafe-muted mt-0.5">{total} cita{total !== 1 ? 's' : ''} registradas</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={() => setFilterStatus('pending')}
              title="Ver citas pendientes"
              aria-label="Ver citas pendientes"
              className="relative p-2.5 rounded-xl border border-cafe-border bg-cafe-card text-cafe-muted hover:text-cafe-goldlight hover:border-cafe-gold/60 transition"
            >
              <Bell className="w-5 h-5" />
              {stats.pending > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-cafe-gold text-cafe-bg text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                  {stats.pending > 99 ? '99+' : stats.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => fetchAppointments(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full border border-cafe-border bg-cafe-card text-cafe-text hover:border-cafe-gold/60 transition disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-cafe-gold ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 lg:p-8 mt-14 md:mt-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-cafe-border border-t-cafe-gold mx-auto" />
                <p className="mt-3 text-cafe-muted text-sm">Cargando citas...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                {[
                  { label: 'Total', value: stats.total, icon: Calendar, tone: 'bg-cafe-gold/10 text-cafe-gold' },
                  { label: 'Pendientes', value: stats.pending, icon: Clock, tone: 'bg-amber-400/10 text-amber-300' },
                  { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, tone: 'bg-emerald-400/10 text-emerald-300' },
                  { label: 'Completadas', value: stats.completed, icon: User, tone: 'bg-sky-400/10 text-sky-300' },
                ].map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="bg-cafe-card rounded-2xl border border-cafe-border p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-cafe-muted">{label}</p>
                        <p className="text-3xl font-display font-medium text-cafe-text mt-2">{value}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${tone}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="bg-cafe-card rounded-2xl border border-cafe-border p-4 mb-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="w-4 h-4 text-cafe-subtle shrink-0" />
                  {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold transition ${
                        filterStatus === s
                          ? 'bg-cafe-gold text-cafe-bg'
                          : 'bg-cafe-soft text-cafe-muted border border-cafe-border hover:text-cafe-text hover:border-cafe-gold/60'
                      }`}
                    >
                      {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      aria-label="Filtrar por fecha"
                      className={selectCls}
                    />
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate('')}
                        aria-label="Quitar filtro de fecha"
                        className={`${iconBtnCls} text-cafe-subtle hover:text-cafe-text hover:bg-cafe-hover`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-red-300">
                    {selectedIds.size} cita{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-red-300/80 hover:text-red-200 hover:underline px-2 py-1.5"
                    >
                      Deseleccionar
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-full transition disabled:opacity-60"
                    >
                      {bulkDeleting ? (
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Eliminar {selectedIds.size}
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-cafe-card rounded-2xl border border-cafe-border overflow-hidden">
                <div className="px-5 py-4 border-b border-cafe-border flex items-center justify-between">
                  <h2 className="font-display font-medium text-cafe-text text-lg">Citas</h2>
                  <span className="text-xs text-cafe-muted">{appointments.length} resultado{appointments.length !== 1 ? 's' : ''}</span>
                </div>

                {appointments.length === 0 ? (
                  <div className="py-16 text-center">
                    <Calendar className="w-10 h-10 text-cafe-border mx-auto mb-3" />
                    <p className="text-cafe-muted font-medium text-sm">
                      {allAppointments.length === 0
                        ? 'Aún no hay citas registradas'
                        : 'Ninguna cita coincide con los filtros aplicados'}
                    </p>
                    {allAppointments.length > 0 && (filterStatus !== 'all' || filterDate) && (
                      <button
                        onClick={() => { setFilterStatus('all'); setFilterDate(''); }}
                        className="mt-3 text-xs font-semibold text-cafe-goldlight hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-cafe-border">
                      {/* Mobile select-all header */}
                      <div className="px-4 py-2.5 bg-cafe-soft flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected; }}
                          onChange={toggleSelectAll}
                          aria-label="Seleccionar todas"
                          className={checkboxCls}
                        />
                        <span className="text-xs text-cafe-muted font-medium">Seleccionar todas</span>
                      </div>

                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={`p-4 space-y-3 transition-colors ${selectedIds.has(apt.id) ? 'bg-cafe-gold/[0.07]' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(apt.id)}
                              onChange={() => toggleSelect(apt.id)}
                              aria-label={`Seleccionar cita de ${apt.clientName}`}
                              className={`${checkboxCls} mt-0.5 shrink-0`}
                            />
                            <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0">
                                <p className="font-semibold text-cafe-text">{apt.clientName}</p>
                                <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5 min-w-0">
                                  <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{apt.clientEmail}</span>
                                </p>
                                <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 shrink-0" /> {apt.clientWhatsApp}
                                </p>
                              </div>
                              {editingId === apt.id ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    aria-label="Nuevo estado"
                                    className={selectCls}
                                  >
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                      <option key={val} value={val}>{label}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleStatusSave(apt.id)}
                                    aria-label="Guardar estado"
                                    className={`${iconBtnCls} text-emerald-400 hover:bg-emerald-400/10`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    aria-label="Cancelar edición"
                                    className={`${iconBtnCls} text-cafe-subtle hover:bg-cafe-hover`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] ?? STATUS_FALLBACK}`}>
                                  {STATUS_LABELS[apt.status] ?? apt.status}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pl-7">
                            <div className="flex items-center gap-3 text-sm min-w-0">
                              <span className="bg-cafe-gold/10 text-cafe-goldlight px-2 py-0.5 rounded-md text-xs font-medium truncate">
                                {apt.serviceName}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-cafe-muted shrink-0">
                                <Calendar className="w-3 h-3" />
                                {new Date(
                                  typeof apt.date === 'string' ? apt.date + 'T12:00:00' : apt.date
                                ).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                {' · '}{apt.time}
                              </span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingId(apt.id); setEditStatus(apt.status); }}
                                aria-label="Editar estado"
                                className={`${iconBtnCls} text-cafe-goldlight hover:bg-cafe-hover`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(apt.id, apt.clientName)}
                                aria-label="Eliminar cita"
                                className={`${iconBtnCls} text-red-400 hover:bg-red-400/10`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-cafe-border">
                        <thead className="bg-cafe-soft">
                          <tr>
                            <th className="pl-5 pr-2 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                onChange={toggleSelectAll}
                                aria-label="Seleccionar todas"
                                className={checkboxCls}
                              />
                            </th>
                            {['Cliente', 'Servicio', 'Fecha y Hora', 'Estado', 'Acciones'].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-cafe-muted uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cafe-border">
                          {appointments.map((apt) => (
                            <tr
                              key={apt.id}
                              className={`transition-colors ${selectedIds.has(apt.id) ? 'bg-cafe-gold/[0.07]' : 'hover:bg-cafe-hover/60'}`}
                            >
                              <td className="pl-5 pr-2 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(apt.id)}
                                  onChange={() => toggleSelect(apt.id)}
                                  aria-label={`Seleccionar cita de ${apt.clientName}`}
                                  className={checkboxCls}
                                />
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold text-cafe-text">{apt.clientName}</p>
                                <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3" /> {apt.clientEmail}
                                </p>
                                <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {apt.clientWhatsApp}
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-sm text-cafe-text">{apt.serviceName}</span>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm text-cafe-text capitalize">
                                  {new Date(
                                    typeof apt.date === 'string' ? apt.date + 'T12:00:00' : apt.date
                                  ).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-xs text-cafe-muted mt-0.5">{apt.time}</p>
                              </td>
                              <td className="px-5 py-4">
                                {editingId === apt.id ? (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value)}
                                      aria-label="Nuevo estado"
                                      className={selectCls}
                                    >
                                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleStatusSave(apt.id)}
                                      aria-label="Guardar estado"
                                      className={`${iconBtnCls} text-emerald-400 hover:bg-emerald-400/10`}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      aria-label="Cancelar edición"
                                      className={`${iconBtnCls} text-cafe-subtle hover:text-cafe-text hover:bg-cafe-hover`}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] ?? STATUS_FALLBACK}`}>
                                    {STATUS_LABELS[apt.status] ?? apt.status}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => { setEditingId(apt.id); setEditStatus(apt.status); }}
                                    title="Editar estado"
                                    aria-label="Editar estado"
                                    className={`${iconBtnCls} text-cafe-goldlight hover:bg-cafe-hover`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(apt.id, apt.clientName)}
                                    title="Eliminar cita"
                                    aria-label="Eliminar cita"
                                    className={`${iconBtnCls} text-red-400 hover:bg-red-400/10`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
