'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Coffee, Lock, Unlock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAvailableHoursForDate } from '@/lib/shared/services';

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${DAYS_ES[d.getDay()]}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type SlotStatus = 'available' | 'blocked' | 'booked';

export default function HorariosPage() {
  const [date, setDate] = useState(todayStr());
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // All 30-min slots for the selected day (respects workingSchedule)
  const allSlots = getAvailableHoursForDate(date, 30);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setBookedSlots([]);
    setBlockedSlots([]);
    try {
      const [bookedRes, blockedRes] = await Promise.all([
        fetch(`/api/bookings/slots?date=${date}`),
        fetch(`/api/admin/blocked-slots?date=${date}`),
      ]);
      if (bookedRes.ok) {
        const data = await bookedRes.json();
        // The slots API merges blocked into booked; use the separate blocked field
        setBookedSlots((data.booked ?? []).filter((s: string) => !(data.blocked ?? []).includes(s)));
        setBlockedSlots(data.blocked ?? []);
      }
      if (blockedRes.ok) {
        const data = await blockedRes.json();
        setBlockedSlots(data.blocked ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const getStatus = (slot: string): SlotStatus => {
    if (bookedSlots.includes(slot)) return 'booked';
    if (blockedSlots.includes(slot)) return 'blocked';
    return 'available';
  };

  const callApi = async (slots: string[], action: 'block' | 'unblock') => {
    const res = await fetch('/api/admin/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, slots, action }),
    });
    if (!res.ok) throw new Error('Error al actualizar');
    const data = await res.json();
    setBlockedSlots(data.blocked ?? []);
    return data.blocked ?? [];
  };

  const toggleSlot = async (slot: string) => {
    const status = getStatus(slot);
    if (status === 'booked' || saving) return;
    const action = status === 'blocked' ? 'unblock' : 'block';
    setSaving(slot);
    try {
      await callApi([slot], action);
      toast.success(action === 'block' ? `${slot} bloqueado` : `${slot} habilitado`);
    } catch {
      toast.error('Error al actualizar el horario');
    } finally {
      setSaving(null);
    }
  };

  const blockLunch = async () => {
    const lunchSlots = allSlots.filter((s) => {
      const h = parseInt(s.split(':')[0], 10);
      return h >= 12 && h < 14;
    }).filter((s) => getStatus(s) !== 'booked');
    if (lunchSlots.length === 0) {
      toast('No hay horas de almuerzo disponibles');
      return;
    }
    setSaving('__lunch__');
    try {
      await callApi(lunchSlots, 'block');
      toast.success('Almuerzo bloqueado (12:00 – 14:00)');
    } catch {
      toast.error('Error al bloquear el almuerzo');
    } finally {
      setSaving(null);
    }
  };

  const blockAll = async () => {
    const toBlock = allSlots.filter((s) => getStatus(s) === 'available');
    if (toBlock.length === 0) {
      toast('No hay horas disponibles para bloquear');
      return;
    }
    setSaving('__all__');
    try {
      await callApi(toBlock, 'block');
      toast.success('Todas las horas disponibles bloqueadas');
    } catch {
      toast.error('Error al bloquear el día');
    } finally {
      setSaving(null);
    }
  };

  const unblockAll = async () => {
    const toUnblock = blockedSlots.filter((s) => allSlots.includes(s));
    if (toUnblock.length === 0) {
      toast('No hay horas bloqueadas');
      return;
    }
    setSaving('__unblock__');
    try {
      await callApi(toUnblock, 'unblock');
      toast.success('Todas las horas desbloqueadas');
    } catch {
      toast.error('Error al desbloquear');
    } finally {
      setSaving(null);
    }
  };

  const countByStatus = (status: SlotStatus) =>
    allSlots.filter((s) => getStatus(s) === status).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bloquea o habilita horas para controlar la disponibilidad de citas
        </p>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 shadow-sm">
        <button
          onClick={() => setDate(offsetDate(date, -1))}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Día anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatDateLabel(date)}</p>
          {date !== todayStr() && (
            <button
              onClick={() => setDate(todayStr())}
              className="text-xs text-primary-600 hover:underline mt-0.5"
            >
              Ir a hoy
            </button>
          )}
        </div>

        <button
          onClick={() => setDate(offsetDate(date, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Día siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={blockLunch}
          disabled={!!saving}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Coffee className="w-4 h-4" />
          Bloquear almuerzo (12–14h)
        </button>
        <button
          onClick={blockAll}
          disabled={!!saving}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="w-4 h-4" />
          Bloquear todo el día
        </button>
        <button
          onClick={unblockAll}
          disabled={!!saving}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Unlock className="w-4 h-4" />
          Desbloquear todo
        </button>
        <button
          onClick={loadSlots}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Recargar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Slot grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : allSlots.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
          Este día no tiene horario de atención configurado
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              Disponible (clic para bloquear)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              Bloqueado (clic para habilitar)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
              Con cita
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {allSlots.map((slot) => {
              const status = getStatus(slot);
              const isSaving = saving === slot;

              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  disabled={status === 'booked' || !!saving}
                  title={
                    status === 'booked'
                      ? 'Este horario tiene una cita'
                      : status === 'blocked'
                      ? 'Clic para habilitar'
                      : 'Clic para bloquear'
                  }
                  className={[
                    'relative flex flex-col items-center justify-center py-3 rounded-xl border-2 text-sm font-medium transition-all select-none',
                    status === 'available'
                      ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-400 cursor-pointer'
                      : '',
                    status === 'blocked'
                      ? 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100 hover:border-red-400 cursor-pointer'
                      : '',
                    status === 'booked'
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : '',
                    saving && saving !== slot ? 'opacity-60' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="font-bold tracking-wide">{slot}</span>
                      <span className="text-[10px] opacity-60 mt-0.5 font-normal">
                        {status === 'available' ? 'Libre' : status === 'blocked' ? 'Bloqueado' : 'Con cita'}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Disponibles', count: countByStatus('available'), bg: 'bg-green-50', text: 'text-green-700' },
              { label: 'Bloqueadas', count: countByStatus('blocked'), bg: 'bg-red-50', text: 'text-red-700' },
              { label: 'Con cita', count: countByStatus('booked'), bg: 'bg-gray-50', text: 'text-gray-700' },
            ].map(({ label, count, bg, text }) => (
              <div key={label} className={`rounded-xl p-3 ${bg}`}>
                <p className={`text-2xl font-bold ${text}`}>{count}</p>
                <p className={`text-xs mt-0.5 ${text} opacity-80`}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
