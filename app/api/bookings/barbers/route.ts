import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { ACTIVE_STATUSES, isStoreConfigured, store } from '@/lib/server/data';

/**
 * Quién está libre en una fecha y hora concretas.
 *
 * El cliente elige primero el horario y después con quién: así no hay que
 * recargar los horarios al cambiar de barbero, y solo se le ofrece gente que
 * de verdad puede atenderlo a esa hora.
 *
 * Lista vacía = la barbería no usa barberos; la reserva va sin asignar.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const time = searchParams.get('time');

  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Fecha u hora inválidas' }, { status: 400 });
  }

  if (!isStoreConfigured()) return NextResponse.json({ barbers: [] });

  try {
    const [equipo, delDia] = await Promise.all([
      store().listBarbers(tenantSlug),
      store().appointmentsOnDate(tenantSlug, date),
    ]);

    const activos = equipo.filter((b) => b.active);
    if (activos.length === 0) return NextResponse.json({ barbers: [] });

    const ocupados = new Set(
      delDia
        .filter((a) => a.time === time && a.barberId && ACTIVE_STATUSES.includes(a.status))
        .map((a) => a.barberId as string)
    );

    return NextResponse.json({
      barbers: activos.filter((b) => !ocupados.has(b.id)).map(({ id, name }) => ({ id, name })),
    });
  } catch {
    // Ante un fallo se devuelve vacío: la cita queda sin asignar y el negocio
    // la reparte, que es preferible a impedir la reserva.
    return NextResponse.json({ barbers: [] });
  }
}
