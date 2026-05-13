'use client';

import { useState } from 'react';

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
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-700 font-semibold text-lg">Cita cancelada</p>
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

  if (status === 'confirming') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center space-y-4">
        <p className="text-amber-800 font-semibold">
          ¿Confirmas que deseas cancelar esta cita?
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
    );
  }

  return (
    <button
      onClick={() => setStatus('confirming')}
      disabled={status === 'loading'}
      className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {status === 'loading' ? 'Cancelando...' : 'Cancelar mi cita'}
    </button>
  );
}
