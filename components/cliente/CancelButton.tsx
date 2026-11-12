'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CancelButton({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleCancel() {
    setStatus('loading');
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? 'No fue posible cancelar la cita.');
        setStatus('error');
        return;
      }
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
        <p className="text-cafe-text font-semibold">Cita cancelada</p>
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

  if (status === 'confirming') {
    return (
      <div className="rounded-xl bg-cafe-soft border border-cafe-border p-5 space-y-4">
        <p className="text-sm text-cafe-text font-semibold text-center">
          ¿Seguro que quieres cancelar esta cita?
        </p>
        <div className="flex gap-3">
          {/* Conservar va primero y con más peso visual: el camino que no se
              puede deshacer no debe ser el que se pulsa por descuido. */}
          <button
            onClick={() => setStatus('idle')}
            className="flex-1 py-2.5 rounded-lg bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg font-semibold text-sm transition"
          >
            No, conservarla
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-400/10 font-semibold text-sm transition"
          >
            Sí, cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setStatus('confirming')}
      disabled={status === 'loading'}
      className="w-full py-3 rounded-xl border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold/40 font-semibold text-sm transition disabled:opacity-50"
    >
      {status === 'loading' ? 'Cancelando...' : 'Cancelar mi cita'}
    </button>
  );
}
