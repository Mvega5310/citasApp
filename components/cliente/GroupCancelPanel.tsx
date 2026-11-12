'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

type GroupAppointment = {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
  isPast: boolean;
};

function formatDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function GroupCancelPanel({
  token,
  appointments,
}: {
  token: string;
  appointments: GroupAppointment[];
}) {
  const selectable = appointments.filter((a) => a.status !== 'cancelled' && !a.isPast);

  const [selected, setSelected] = useState<Set<string>>(new Set(selectable.map((a) => a.id)));
  const [status, setStatus] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cancelledCount, setCancelledCount] = useState(0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCancel() {
    setStatus('loading');
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, appointmentIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? 'No fue posible cancelar las citas.');
        setStatus('error');
        return;
      }
      setCancelledCount(data.cancelledCount ?? selected.size);
      setStatus('done');
    } catch {
      setMessage('Error de conexión. Intenta de nuevo.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-xl bg-cafe-soft border border-cafe-border p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-cafe-text font-semibold">
          {cancelledCount === 1 ? 'Cita cancelada' : `${cancelledCount} citas canceladas`}
        </p>
        <p className="text-sm text-cafe-muted mt-1.5 leading-relaxed">
          Te enviamos un correo de confirmación. Puedes volver a reservar cuando quieras.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-cafe-goldlight hover:text-cafe-gold transition"
        >
          Reservar otro turno
        </a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-red-400/10 border border-red-400/25 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-red-300 font-semibold leading-relaxed">{message}</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-semibold text-cafe-goldlight hover:text-cafe-gold transition"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {appointments.map((a) => {
          const disabled = a.status === 'cancelled' || a.isPast;
          return (
            <label
              key={a.id}
              className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                disabled
                  ? 'border-cafe-border/50 bg-cafe-soft/40 opacity-60'
                  : 'border-cafe-border hover:border-cafe-gold/40 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                disabled={disabled}
                onChange={() => toggle(a.id)}
                className="mt-1 w-4 h-4 rounded accent-cafe-gold shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cafe-text">{a.serviceName}</p>
                <p className="text-xs text-cafe-muted capitalize">
                  {formatDate(a.date)} · {a.time}
                </p>
                {a.status === 'cancelled' && (
                  <p className="text-xs text-cafe-subtle mt-0.5">Ya cancelada</p>
                )}
                {a.isPast && a.status !== 'cancelled' && (
                  <p className="text-xs text-cafe-subtle mt-0.5">Esta cita ya pasó</p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {status === 'confirming' ? (
        <div className="rounded-xl bg-cafe-soft border border-cafe-border p-5 space-y-4">
          <p className="text-sm text-cafe-text font-semibold text-center">
            ¿Seguro que quieres cancelar{' '}
            {selected.size === 1 ? 'esta cita' : `estas ${selected.size} citas`}?
          </p>
          <div className="flex gap-3">
            {/* Conservar va primero y con más peso visual: el camino que no se
                puede deshacer no debe ser el que se pulsa por descuido. */}
            <button
              onClick={() => setStatus('idle')}
              className="flex-1 py-2.5 rounded-lg bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg font-semibold text-sm transition"
            >
              No, conservar
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-400/10 font-semibold text-sm transition"
            >
              Sí, cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setStatus('confirming')}
          disabled={selected.size === 0 || status === 'loading'}
          className="w-full py-3 rounded-xl border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold/40 font-semibold text-sm transition disabled:opacity-50"
        >
          {status === 'loading'
            ? 'Cancelando...'
            : selected.size === 0
              ? 'Selecciona al menos una cita'
              : selected.size === 1
                ? 'Cancelar cita seleccionada'
                : `Cancelar ${selected.size} citas seleccionadas`}
        </button>
      )}
    </div>
  );
}
