'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
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
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

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
        toast.success('Cita eliminada');
      } else {
        toast.error('Error al eliminar');
      }
    } catch { toast.error('Error de conexión'); }
  };

  // Stats always computed from full dataset, not filtered view
  const stats = {
    total: allAppointments.length,
    pending: allAppointments.filter((a) => a.status === 'pending').length,
    confirmed: allAppointments.filter((a) => a.status === 'confirmed').length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 md:flex items-center justify-between hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-serif">Panel</h1>
            <p className="text-sm text-gray-500">{total} cita{total !== 1 ? 's' : ''} registradas</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={() => setFilterStatus('pending')}
              title="Ver citas pendientes"
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            >
              <Bell className="w-5 h-5" />
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                  {stats.pending > 99 ? '99+' : stats.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => fetchAppointments(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 mt-14 md:mt-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mx-auto" />
                <p className="mt-3 text-gray-500 text-sm">Cargando citas...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total', value: stats.total, icon: Calendar, color: 'blue' },
                  { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'yellow' },
                  { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, color: 'green' },
                  { label: 'Completadas', value: stats.completed, icon: User, color: 'purple' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${color}-100 rounded-lg`}>
                        <Icon className={`w-5 h-5 text-${color}-600`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                  {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        filterStatus === s
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                    {filterDate && (
                      <button onClick={() => setFilterDate('')} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 text-sm">Citas</h2>
                  <span className="text-xs text-gray-400">{appointments.length} resultado{appointments.length !== 1 ? 's' : ''}</span>
                </div>

                {appointments.length === 0 ? (
                  <div className="py-16 text-center">
                    <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium text-sm">
                      {allAppointments.length === 0
                        ? 'Aún no hay citas registradas'
                        : 'Ninguna cita coincide con los filtros aplicados'}
                    </p>
                    {allAppointments.length > 0 && (filterStatus !== 'all' || filterDate) && (
                      <button
                        onClick={() => { setFilterStatus('all'); setFilterDate(''); }}
                        className="mt-3 text-xs text-pink-500 hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-50">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Cliente', 'Servicio', 'Fecha y Hora', 'Estado', 'Acciones'].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {appointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-gray-900">{apt.clientName}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" /> {apt.clientEmail}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> {apt.clientWhatsApp}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm text-gray-800">{apt.serviceName}</span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-gray-800">
                                {new Date(
                                  typeof apt.date === 'string' ? apt.date + 'T12:00:00' : apt.date
                                ).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{apt.time}</p>
                            </td>
                            <td className="px-5 py-4">
                              {editingId === apt.id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                  >
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                      <option key={val} value={val}>{label}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleStatusSave(apt.id)} className="text-green-600 hover:text-green-800">
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] ?? 'bg-gray-100 text-gray-800'}`}>
                                  {STATUS_LABELS[apt.status] ?? apt.status}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-3">
                                <button
                                  onClick={() => { setEditingId(apt.id); setEditStatus(apt.status); }}
                                  title="Editar estado"
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(apt.id, apt.clientName)}
                                  title="Eliminar cita"
                                  className="text-red-500 hover:text-red-700 transition-colors"
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
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
