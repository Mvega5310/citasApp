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
  CheckCheck,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  X,
  Bell,
  XCircle,
  Save,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

type AppointmentStatus = Appointment['status'];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/30',
  confirmed: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/30',
  completed: 'bg-sky-400/10 text-sky-300 ring-1 ring-inset ring-sky-400/30',
  cancelled: 'bg-red-400/10 text-red-300 ring-1 ring-inset ring-red-400/30',
};
const STATUS_FALLBACK = 'bg-cafe-soft text-cafe-muted ring-1 ring-inset ring-cafe-border';

// Selector visual de estados (móvil): botones grandes en lugar del desplegable
const STATUS_OPTIONS: {
  value: AppointmentStatus;
  label: string;
  description: string;
  icon: typeof Clock;
  style: string;
  activeStyle: string;
}[] = [
  {
    value: 'pending',
    label: 'Pendiente',
    description: 'La cita está pendiente',
    icon: Clock,
    style: 'border-amber-400/25 bg-amber-400/5 text-amber-300',
    activeStyle: 'border-amber-400 bg-amber-400/15 text-amber-200 ring-2 ring-amber-400/30',
  },
  {
    value: 'confirmed',
    label: 'Confirmar',
    description: 'El cliente tiene su cita confirmada',
    icon: CheckCircle,
    style: 'border-emerald-400/25 bg-emerald-400/5 text-emerald-300',
    activeStyle: 'border-emerald-400 bg-emerald-400/15 text-emerald-200 ring-2 ring-emerald-400/30',
  },
  {
    value: 'completed',
    label: 'Completada',
    description: 'El servicio ya fue realizado',
    icon: CheckCheck,
    style: 'border-sky-400/25 bg-sky-400/5 text-sky-300',
    activeStyle: 'border-sky-400 bg-sky-400/15 text-sky-200 ring-2 ring-sky-400/30',
  },
  {
    value: 'cancelled',
    label: 'Cancelar',
    description: 'La cita ha sido cancelada',
    icon: XCircle,
    style: 'border-red-400/25 bg-red-400/5 text-red-300',
    activeStyle: 'border-red-400 bg-red-400/15 text-red-200 ring-2 ring-red-400/30',
  },
];

// Clases explícitas: Tailwind no genera clases armadas dinámicamente (bg-${color}-100)
const STAT_STYLES = {
  gold: { background: 'bg-cafe-gold/10', text: 'text-cafe-gold' },
  amber: { background: 'bg-amber-400/10', text: 'text-amber-300' },
  emerald: { background: 'bg-emerald-400/10', text: 'text-emerald-300' },
  sky: { background: 'bg-sky-400/10', text: 'text-sky-300' },
};

// Estilos reutilizados en la vista (solo presentación)
const selectCls =
  'text-xs bg-cafe-soft text-cafe-text border border-cafe-border rounded-lg px-2 py-2 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 disabled:opacity-50';
const iconBtnCls = 'p-1.5 rounded-lg transition-colors';

/** Filas por página en el listado de citas. */
const POR_PAGINA = 20;

export default function AdminPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagina, setPagina] = useState(1);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDate, setFilterDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AppointmentStatus | ''>('');
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchAppointments = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetch('/api/admin/appointments');

        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }

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
    },
    [router]
  );

  // Filtros locales
  useEffect(() => {
    let filtered = allAppointments;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }

    if (filterDate) {
      filtered = filtered.filter((a) => a.date === filterDate);
    }

    setAppointments(filtered);
    // Al cambiar el filtro, volver al principio: quedarse en la página 7 de
    // un resultado que ahora tiene 2 deja la pantalla vacía sin explicación.
    setPagina(1);
  }, [allAppointments, filterStatus, filterDate]);



  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Abrir editor de estado
  const openStatusEditor = (apt: Appointment) => {
    setEditingId(apt.id);
    setEditStatus(apt.status);
  };

  // Cancelar edición
  const closeStatusEditor = () => {
    setEditingId(null);
    setEditStatus('');
  };

  // Guardar estado
  const handleStatusSave = async (id: string, requestedStatus?: AppointmentStatus) => {
    const newStatus = requestedStatus || editStatus;

    if (!newStatus || savingStatusId) return;

    const appointment = allAppointments.find((apt) => apt.id === id);

    if (!appointment) return;

    if (
      newStatus === 'cancelled' &&
      appointment.status !== 'cancelled' &&
      !confirm('¿Estás seguro de que deseas cancelar esta cita?')
    ) {
      return;
    }

    setSavingStatusId(id);

    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setAllAppointments((prev) =>
          prev.map((apt) =>
            apt.id === id
              ? {
                  ...apt,
                  status: newStatus,
                  updatedAt: new Date(),
                }
              : apt
          )
        );

        closeStatusEditor();
        toast.success('Estado actualizado correctamente');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Error al actualizar el estado');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSavingStatusId(null);
    }
  };

  // Eliminar una cita
  const handleDelete = async (id: string, clientName: string) => {
    if (!confirm(`¿Eliminar la cita de ${clientName}?`)) return;

    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAllAppointments((prev) => prev.filter((apt) => apt.id !== id));

        setTotal((t) => Math.max(0, t - 1));

        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        toast.success('Cita eliminada');
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Eliminar varias citas: solo se quitan de la lista las que el servidor eliminó
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0 || bulkDeleting) return;

    if (!confirm(`¿Eliminar ${ids.length} cita${ids.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setBulkDeleting(true);

    const deletedIds = new Set<string>();

    try {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/appointments/${id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            deletedIds.add(id);
          }
        } catch {
          // Se conserva la cita si falla la petición.
        }
      }

      if (deletedIds.size > 0) {
        setAllAppointments((prev) => prev.filter((apt) => !deletedIds.has(apt.id)));

        setTotal((t) => Math.max(0, t - deletedIds.size));
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });

      if (deletedIds.size === ids.length) {
        toast.success(
          `${deletedIds.size} cita${deletedIds.size !== 1 ? 's' : ''} eliminada${deletedIds.size !== 1 ? 's' : ''}`
        );
      } else {
        toast.error(`${deletedIds.size} eliminadas. ${ids.length - deletedIds.size} no pudieron eliminarse.`);
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  // Seleccionar solamente las citas visibles
  // Paginación en pantalla: con una barbería que trabaja a diario, el listado
  // completo son miles de filas y el navegador las pinta todas.
  const totalPaginas = Math.max(1, Math.ceil(appointments.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const visibles = appointments.slice(desde, desde + POR_PAGINA);

  const allSelected = visibles.length > 0 && visibles.every((apt) => selectedIds.has(apt.id));

  const someSelected = visibles.some((apt) => selectedIds.has(apt.id)) && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allSelected) {
        visibles.forEach((apt) => next.delete(apt.id));
      } else {
        visibles.forEach((apt) => next.add(apt.id));
      }

      return next;
    });
  };

  const stats = {
    total: allAppointments.length,
    pending: allAppointments.filter((a) => a.status === 'pending').length,
    confirmed: allAppointments.filter((a) => a.status === 'confirmed').length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
  };

  const formatAppointmentDate = (date: Appointment['date']) => {
    return new Date(typeof date === 'string' ? date + 'T12:00:00' : date).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior */}
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-6 lg:px-8 py-5 md:flex items-center justify-between hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cafe-gold mb-1">
              Administración
            </p>
            <h1 className="text-2xl font-medium text-cafe-text font-display">Panel</h1>
            <p className="text-sm text-cafe-muted mt-0.5">
              {total} cita{total !== 1 ? 's' : ''} registradas
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full border border-cafe-border bg-cafe-card text-cafe-text hover:border-cafe-gold/60 transition disabled:opacity-50"
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
              {/* Estadísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                {[
                  { label: 'Total', value: stats.total, icon: Calendar, color: 'gold' as const },
                  { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'amber' as const },
                  { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, color: 'emerald' as const },
                  { label: 'Completadas', value: stats.completed, icon: User, color: 'sky' as const },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-cafe-card rounded-2xl border border-cafe-border p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-cafe-muted">{label}</p>
                        <p className="text-3xl font-display font-medium text-cafe-text mt-2">{value}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${STAT_STYLES[color].background}`}>
                        <Icon className={`w-5 h-5 ${STAT_STYLES[color].text}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filtros */}
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
                        className={`${iconBtnCls} text-cafe-subtle hover:text-cafe-text hover:bg-cafe-hover`}
                        aria-label="Limpiar fecha"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones masivas */}
              {selectedIds.size > 0 && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-red-300">
                    {selectedIds.size} cita{selectedIds.size !== 1 ? 's' : ''} seleccionada
                    {selectedIds.size !== 1 ? 's' : ''}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      disabled={bulkDeleting}
                      className="text-xs text-red-300/80 hover:text-red-200 hover:underline px-2 py-1.5 disabled:opacity-50"
                    >
                      Deseleccionar
                    </button>

                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-full transition disabled:opacity-60"
                    >
                      {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Eliminar {selectedIds.size}
                    </button>
                  </div>
                </div>
              )}

              {/* Listado */}
              <div className="bg-cafe-card rounded-2xl border border-cafe-border overflow-hidden">
                <div className="px-5 py-4 border-b border-cafe-border flex items-center justify-between">
                  <h2 className="font-display font-medium text-cafe-text text-lg">Citas</h2>
                  <span className="text-xs text-cafe-muted tabular-nums">
                    {appointments.length === 0
                      ? '0 resultados'
                      : appointments.length <= POR_PAGINA
                        ? `${appointments.length} resultado${appointments.length !== 1 ? 's' : ''}`
                        : `${desde + 1}–${desde + visibles.length} de ${appointments.length}`}
                  </span>
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
                        onClick={() => {
                          setFilterStatus('all');
                          setFilterDate('');
                        }}
                        className="mt-3 text-xs font-semibold text-cafe-goldlight hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* VISTA MÓVIL */}
                    <div className="md:hidden divide-y divide-cafe-border">
                      <div className="px-4 py-3 bg-cafe-soft flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={toggleSelectAll}
                          aria-label="Seleccionar todas"
                          className="w-5 h-5 rounded accent-cafe-gold cursor-pointer"
                        />

                        <span className="text-sm text-cafe-muted font-medium">Seleccionar todas</span>
                      </div>

                      {visibles.map((apt) => {
                        const isEditing = editingId === apt.id;
                        const isSaving = savingStatusId === apt.id;

                        return (
                          <div
                            key={apt.id}
                            className={`p-4 space-y-4 transition-colors ${
                              selectedIds.has(apt.id) ? 'bg-cafe-gold/[0.07]' : ''
                            }`}
                          >
                            {/* Datos del cliente */}
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(apt.id)}
                                onChange={() => toggleSelect(apt.id)}
                                aria-label={`Seleccionar cita de ${apt.clientName}`}
                                className="w-5 h-5 mt-1 rounded accent-cafe-gold cursor-pointer shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-cafe-text text-base">{apt.clientName}</p>

                                <p className="text-sm text-cafe-muted flex items-center gap-2 mt-1 break-all">
                                  <Mail className="w-4 h-4 shrink-0" />
                                  {apt.clientEmail}
                                </p>

                                <p className="text-sm text-cafe-muted flex items-center gap-2 mt-1">
                                  <Phone className="w-4 h-4 shrink-0" />
                                  {apt.clientWhatsApp}
                                </p>
                              </div>
                            </div>

                            {/* Servicio y horario */}
                            <div className="pl-8 space-y-2">
                              <span className="inline-flex bg-cafe-gold/10 text-cafe-goldlight px-3 py-1.5 rounded-lg text-sm font-semibold">
                                {apt.serviceName}
                              </span>

                              <div className="flex items-center gap-2 text-sm text-cafe-muted">
                                <Calendar className="w-4 h-4 shrink-0" />
                                <span className="capitalize">
                                  {formatAppointmentDate(apt.date)}
                                  {' · '}
                                  {apt.time}
                                </span>
                              </div>
                            </div>

                            {/* Estado actual */}
                            <div className="pl-8">
                              <p className="text-xs text-cafe-subtle font-semibold uppercase tracking-wide mb-2">
                                Estado de la reserva
                              </p>

                              <div className="flex items-center justify-between gap-3">
                                <span
                                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold ${
                                    STATUS_COLORS[apt.status] ?? STATUS_FALLBACK
                                  }`}
                                >
                                  {STATUS_LABELS[apt.status] ?? apt.status}
                                </span>

                                {!isEditing && (
                                  <button
                                    onClick={() => openStatusEditor(apt)}
                                    className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-cafe-gold/40 bg-cafe-gold/10 text-cafe-goldlight font-semibold text-sm active:scale-95 transition"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Cambiar estado
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Editor visual de estado */}
                            {isEditing && (
                              <div className="ml-8 p-3 sm:p-4 rounded-2xl border border-cafe-border bg-cafe-soft space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-cafe-text text-sm">Selecciona el nuevo estado</p>

                                  <button
                                    onClick={closeStatusEditor}
                                    disabled={isSaving}
                                    className="p-2 rounded-lg text-cafe-subtle hover:text-cafe-text hover:bg-cafe-hover"
                                    aria-label="Cerrar editor"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {STATUS_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const active = editStatus === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => setEditStatus(option.value)}
                                        aria-pressed={active}
                                        title={option.description}
                                        className={`min-h-[88px] p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 disabled:opacity-50 ${
                                          active ? option.activeStyle : option.style
                                        }`}
                                      >
                                        <Icon className="w-6 h-6" />

                                        <span className="font-bold text-sm">{option.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={closeStatusEditor}
                                    disabled={isSaving}
                                    className="flex-1 min-h-12 rounded-xl border border-cafe-border bg-cafe-card text-cafe-text font-semibold text-sm"
                                  >
                                    Volver
                                  </button>

                                  <button
                                    onClick={() => handleStatusSave(apt.id)}
                                    disabled={isSaving || !editStatus || editStatus === apt.status}
                                    className="flex-1 min-h-12 rounded-xl bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Acciones */}
                            <div className="pl-8 flex justify-end">
                              <button
                                onClick={() => handleDelete(apt.id, apt.clientName)}
                                className="min-h-10 px-3 inline-flex items-center gap-2 rounded-lg text-red-400 hover:bg-red-400/10 text-sm font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar cita
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* VISTA ESCRITORIO */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-cafe-border">
                        <thead className="bg-cafe-soft">
                          <tr>
                            <th className="pl-5 pr-2 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someSelected;
                                }}
                                onChange={toggleSelectAll}
                                aria-label="Seleccionar todas"
                                className="w-4 h-4 rounded accent-cafe-gold cursor-pointer"
                              />
                            </th>

                            {['Cliente', 'Servicio', 'Fecha y Hora', 'Estado', 'Acciones'].map((h) => (
                              <th
                                key={h}
                                className="px-5 py-3 text-left text-[11px] font-semibold text-cafe-muted uppercase tracking-wider"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-cafe-border">
                          {visibles.map((apt) => (
                            <tr
                              key={apt.id}
                              className={`transition-colors ${
                                selectedIds.has(apt.id) ? 'bg-cafe-gold/[0.07]' : 'hover:bg-cafe-hover/60'
                              }`}
                            >
                              <td className="pl-5 pr-2 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(apt.id)}
                                  onChange={() => toggleSelect(apt.id)}
                                  aria-label={`Seleccionar cita de ${apt.clientName}`}
                                  className="w-4 h-4 rounded accent-cafe-gold cursor-pointer"
                                />
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold text-cafe-text">{apt.clientName}</p>

                                <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3" />
                                  {apt.clientEmail}
                                </p>

                                <p className="text-xs text-cafe-muted flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {apt.clientWhatsApp}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-sm text-cafe-text">{apt.serviceName}</span>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm text-cafe-text capitalize">{formatAppointmentDate(apt.date)}</p>
                                <p className="text-xs text-cafe-muted mt-0.5">{apt.time}</p>
                              </td>

                              <td className="px-5 py-4">
                                {editingId === apt.id ? (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={editStatus}
                                      disabled={savingStatusId === apt.id}
                                      onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)}
                                      aria-label="Nuevo estado"
                                      className={selectCls}
                                    >
                                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>
                                          {label}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      onClick={() => handleStatusSave(apt.id)}
                                      disabled={savingStatusId === apt.id || editStatus === apt.status}
                                      className={`${iconBtnCls} text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40`}
                                      title="Guardar estado"
                                      aria-label="Guardar estado"
                                    >
                                      {savingStatusId === apt.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : (
                                        <CheckCircle className="w-5 h-5" />
                                      )}
                                    </button>

                                    <button
                                      onClick={closeStatusEditor}
                                      disabled={savingStatusId === apt.id}
                                      className={`${iconBtnCls} text-cafe-subtle hover:text-cafe-text hover:bg-cafe-hover`}
                                      title="Cancelar edición"
                                      aria-label="Cancelar edición"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                      STATUS_COLORS[apt.status] ?? STATUS_FALLBACK
                                    }`}
                                  >
                                    {STATUS_LABELS[apt.status] ?? apt.status}
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openStatusEditor(apt)}
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

                {totalPaginas > 1 && (
                  <div className="px-5 py-4 border-t border-cafe-border flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setPagina(paginaActual - 1)}
                      disabled={paginaActual === 1}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-cafe-border"
                    >
                      Anteriores
                    </button>
                    <span className="text-xs text-cafe-muted tabular-nums">
                      Página {paginaActual} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagina(paginaActual + 1)}
                      disabled={paginaActual === totalPaginas}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-cafe-border"
                    >
                      Siguientes
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
