import { verifyCancelToken, msUntilAppointment, CANCEL_WINDOW_MS } from '@/lib/server/cancelToken';
import { isStoreConfigured, store } from '@/lib/server/data';
import { marcaDeLaPagina } from '@/lib/server/marca';
import CancelButton from '@/components/cliente/CancelButton';
import GroupCancelPanel from '@/components/cliente/GroupCancelPanel';
import { AlertTriangle, CalendarClock, Link as LinkIcon } from 'lucide-react';

function formatDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Iniciales para el sello, igual que en la tirilla de la reserva. */
function inicialesDe(nombre: string) {
  return (
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BT'
  );
}

/**
 * Pantalla de aviso: enlace inválido o cita ya pasada.
 *
 * Sin nombre de barbería a propósito: si el enlace no se pudo verificar, no
 * sabemos de quién es la cita, y poner un nombre ahí sería inventarlo.
 */
function Aviso({
  icono: Icono,
  titulo,
  mensaje,
}: {
  icono: typeof LinkIcon;
  titulo: string;
  mensaje: string;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-cafe-bg">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-cafe-soft border border-cafe-border flex items-center justify-center mx-auto mb-5">
          <Icono className="w-6 h-6 text-cafe-muted" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-display font-medium text-cafe-text">{titulo}</h1>
        <p className="text-sm text-cafe-muted mt-2 leading-relaxed">{mensaje}</p>
        <a
          href="/"
          className="inline-block mt-6 text-sm font-semibold text-cafe-goldlight hover:text-cafe-gold transition"
        >
          Volver al inicio
        </a>
      </div>
    </main>
  );
}

/** Cabecera con el sello de la barbería, como la tirilla que recibió al reservar. */
function Cabecera({ salonName, titulo, clientName }: { salonName: string; titulo: string; clientName: string }) {
  return (
    <div
      className="px-6 pt-6 pb-5 text-center"
      style={{
        background: 'linear-gradient(135deg, #2E241B 0%, #191511 100%)',
        borderBottom: '1px solid #403328',
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-cafe-gold/15 ring-1 ring-cafe-gold/40 flex items-center justify-center mx-auto mb-3 font-bold text-cafe-goldlight font-display text-sm">
        {inicialesDe(salonName)}
      </div>
      <p className="text-white font-semibold text-lg font-display">{salonName}</p>
      <p className="text-cafe-goldlight text-sm mt-0.5">{titulo}</p>
      <p className="text-cafe-subtle text-xs mt-1.5">{clientName}</p>
    </div>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-cafe-bg">
      <div
        className="max-w-sm w-full rounded-[22px] overflow-hidden"
        style={{ background: '#201A15', border: '1.5px solid #403328' }}
      >
        {children}
      </div>
    </main>
  );
}

export default async function CancelPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const payload = await verifyCancelToken(token);

  const enlaceInvalido = (
    <Aviso
      icono={LinkIcon}
      titulo="Enlace inválido"
      mensaje="Este enlace de cancelación no es válido o ya expiró. Si necesitas cambiar tu cita, escríbele a la barbería."
    />
  );

  if (!payload) return enlaceInvalido;

  const { nombre: salonName } = await marcaDeLaPagina();

  if (payload.kind === 'group') {
    const { groupId, tenantSlug, clientName } = payload;

    if (!isStoreConfigured()) return enlaceInvalido;

    const group = await store().appointmentsInGroup(tenantSlug, groupId);
    const appointments = group
      .map((a) => ({
        id: a.id,
        serviceName: a.serviceName,
        date: a.date,
        time: a.time,
        status: a.status as string,
        isPast: msUntilAppointment(a.date, a.time) < 0,
      }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (appointments.length === 0) return enlaceInvalido;

    return (
      <Tarjeta>
        <Cabecera salonName={salonName} titulo="Gestionar mis citas" clientName={clientName} />
        <div className="p-6">
          <GroupCancelPanel token={token} appointments={appointments} />
        </div>
      </Tarjeta>
    );
  }

  const { serviceName, clientName, date, time } = payload;
  const msLeft = msUntilAppointment(date, time);
  const isPast = msLeft < 0;
  const isLate = msLeft >= 0 && msLeft < CANCEL_WINDOW_MS;

  if (isPast) {
    return (
      <Aviso
        icono={CalendarClock}
        titulo="Esta cita ya pasó"
        mensaje="Ya no se puede cancelar. Si quieres otro turno, puedes reservarlo de nuevo."
      />
    );
  }

  return (
    <Tarjeta>
      <Cabecera salonName={salonName} titulo="Cancelar mi cita" clientName={clientName} />

      {/* Perforado, igual que la tirilla de la reserva */}
      <div className="relative flex items-center px-4">
        <div className="absolute -left-3 w-6 h-6 rounded-full" style={{ background: '#100E0C' }} />
        <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#403328' }} />
        <div className="absolute -right-3 w-6 h-6 rounded-full" style={{ background: '#100E0C' }} />
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Servicio" value={serviceName} />
          <Detail label="Hora" value={time} />
          <div className="col-span-2">
            <Detail label="Fecha" value={formatDate(date)} capitalizar />
          </div>
        </div>

        {isLate && (
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/25 p-3.5 flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-amber-200 leading-relaxed">
              Faltan menos de 30 minutos. Puedes cancelar, pero se le avisará a la barbería: a esta hora
              ya no alcanzan a darle el turno a nadie más.
            </p>
          </div>
        )}

        <CancelButton token={token} />

        <p className="text-xs text-cafe-subtle text-center leading-relaxed">
          ¿Prefieres cambiarla de hora en vez de cancelarla?{' '}
          <a href="/" className="text-cafe-goldlight hover:text-cafe-gold transition">
            Escríbele a la barbería
          </a>
          .
        </p>
      </div>
    </Tarjeta>
  );
}

function Detail({ label, value, capitalizar }: { label: string; value: string; capitalizar?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-cafe-subtle">{label}</p>
      <p className={`text-sm font-semibold text-cafe-text ${capitalizar ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}
