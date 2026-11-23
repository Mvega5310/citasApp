import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { editableCatalogFor } from '@/lib/server/catalog';
import { logger } from '@/lib/server/logger';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRECIO_MAX = 10_000_000;

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Un corte que no pasó por la reserva: no llegó quien apartó y el barbero
 * atendió a otra persona, o le alcanzó el tiempo para uno más. Entra directo
 * como completada -ya sucedió, no reserva un horario futuro- y queda marcada
 * `source: 'manual'` para distinguirla en el panel y en el Cierre.
 *
 * Solo admin, no viewer: es una entrada que afecta la facturación.
 */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  let body: {
    serviceId?: unknown;
    date?: unknown;
    time?: unknown;
    barberId?: unknown;
    price?: unknown;
    clientName?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const serviceId = String(body.serviceId ?? '');
  const servicio = editableCatalogFor(auth.tenant).services.find((s) => s.id === serviceId);
  if (!servicio) {
    return NextResponse.json({ error: 'Selecciona un servicio del catálogo.' }, { status: 400 });
  }

  const date = String(body.date ?? '');
  if (!FORMATO_FECHA.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida.' }, { status: 400 });
  }
  // Un adicional registra algo que ya pasó; a futuro no tiene sentido porque
  // todavía no ha sucedido.
  if (date > hoyISO()) {
    return NextResponse.json({ error: 'No puedes registrar un adicional en una fecha futura.' }, { status: 400 });
  }

  const time = String(body.time ?? '');
  if (!FORMATO_HORA.test(time)) {
    return NextResponse.json({ error: 'Hora inválida.' }, { status: 400 });
  }

  let barberId: string | null = null;
  if (body.barberId) {
    const barberos = await store().listBarbers(auth.tenant.slug);
    const b = barberos.find((x) => x.id === body.barberId);
    if (!b) return NextResponse.json({ error: 'Ese barbero no existe en esta barbería.' }, { status: 400 });
    barberId = b.id;
  }

  const precioCrudo = body.price === undefined || body.price === null || body.price === ''
    ? servicio.price
    : Number(body.price);
  if (!Number.isFinite(precioCrudo) || precioCrudo < 0 || precioCrudo > PRECIO_MAX) {
    return NextResponse.json({ error: 'El precio no es válido.' }, { status: 400 });
  }

  const clientName = String(body.clientName ?? '').trim().slice(0, 60) || 'Cliente sin reserva';

  try {
    const cita = await store().createManualAppointment(auth.tenant.slug, {
      serviceId: servicio.id,
      serviceName: servicio.name,
      clientName,
      date,
      time,
      barberId,
      price: Math.round(precioCrudo),
    });
    return NextResponse.json({ ok: true, appointment: cita });
  } catch (error) {
    logger.warn('manual_appointment_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo registrar el adicional.' }, { status: 500 });
  }
}
