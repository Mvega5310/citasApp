'use client';

import { useState } from 'react';

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
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-700 font-semibold text-lg">
          {cancelledCount === 1 ? 'Cita cancelada' : `${cancelledCount} citas canceladas`}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Te enviamos un correo de confirmación. Puedes volver a reservar cuando quieras.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-sm text-primary-600 underline underline-offset-2"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-700 font-semibold">{message}</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm text-red-600 underline underline-offset-2"
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
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                disabled
                  ? 'border-gray-100 bg-gray-50 opacity-60'
                  : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                disabled={disabled}
                onChange={() => toggle(a.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{a.serviceName}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(a.date)} · {a.time}
                </p>
                {a.status === 'cancelled' && (
                  <p className="text-xs text-gray-400 mt-0.5">Ya cancelada</p>
                )}
                {a.isPast && a.status !== 'cancelled' && (
                  <p className="text-xs text-gray-400 mt-0.5">Cita ya transcurrida</p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {status === 'confirming' ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center space-y-3">
          <p className="text-amber-800 font-semibold text-sm">
            ¿Confirmas que deseas cancelar {selected.size === 1 ? 'esta cita' : `estas ${selected.size} citas`}?
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleCancel}
              className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
            >
              Sí, cancelar
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="px-5 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              No, conservar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setStatus('confirming')}
          disabled={selected.size === 0 || status === 'loading'}
          className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
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
