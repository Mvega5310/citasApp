import { verifyCancelToken, msUntilAppointment, CANCEL_WINDOW_MS } from '@/lib/server/cancelToken';
import CancelButton from '@/components/cliente/CancelButton';

function formatDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function CancelPage({ params }: { params: { token: string } }) {
  const payload = await verifyCancelToken(params.token);

  if (!payload) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🔗</div>
          <h1 className="text-xl font-bold text-gray-800">Enlace inválido</h1>
          <p className="text-gray-500 text-sm">
            Este enlace de cancelación no es válido o ya expiró.
          </p>
          <a href="/" className="inline-block mt-2 text-sm text-primary-600 underline underline-offset-2">
            Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  const { token } = params;
  const { serviceName, clientName, date, time } = payload;
  const msLeft = msUntilAppointment(date, time);
  const isPast = msLeft < 0;
  const isLate = msLeft >= 0 && msLeft < CANCEL_WINDOW_MS;

  if (isPast) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🕐</div>
          <h1 className="text-xl font-bold text-gray-800">Cita ya transcurrida</h1>
          <p className="text-gray-500 text-sm">
            Esta cita ya ocurrió y no puede cancelarse.
          </p>
          <a href="/" className="inline-block mt-2 text-sm text-primary-600 underline underline-offset-2">
            Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-primary-600 to-accent-500 p-8 text-center">
          <div className="text-4xl mb-2">📅</div>
          <h1 className="text-white text-xl font-bold">Cancelar cita</h1>
          <p className="text-white/80 text-sm mt-1">{clientName}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Detail label="Servicio" value={serviceName} />
            <Detail label="Fecha" value={formatDate(date)} />
            <Detail label="Hora" value={time} />
          </div>

          {isLate && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
              ⚠️ Estás cancelando con menos de 30 minutos de anticipación. Se notificará al salón.
            </div>
          )}

          <CancelButton token={token} />
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[80px]">
        {label}
      </span>
      <span className="text-gray-800 text-sm font-medium">{value}</span>
    </div>
  );
}
