import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { ACTIVE_STATUSES, isStoreConfigured, store } from '@/lib/server/data';

/**
 * Horarios no disponibles de un día.
 *
 * Sin barberos configurados se comporta como siempre: una cita por horario.
 * Con barberos:
 *  - `barberId=<id>` → ocupados los de ESE barbero.
 *  - sin `barberId` ("cualquiera disponible") → ocupados solo los horarios en
 *    los que TODOS los barberos activos están tomados; si queda uno libre, el
 *    horario se ofrece.
 *
 * Los horarios bloqueados valen para todos: es el local el que cierra, no una
 * persona.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const barberId = searchParams.get('barberId')?.trim() || null;

  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  if (isStoreConfigured()) {
    try {
      const [sameDay, blocked, barbers] = await Promise.all([
        store().appointmentsOnDate(tenantSlug, date),
        store().blockedSlots(tenantSlug, date).catch(() => [] as string[]),
        store().listBarbers(tenantSlug).catch(() => []),
      ]);

      const activas = sameDay.filter((a) => ACTIVE_STATUSES.includes(a.status));
      const equipo = barbers.filter((b) => b.active);

      let ocupados: string[];
      if (equipo.length === 0) {
        // Sin equipo configurado: una cita por horario, igual que antes.
        ocupados = activas.map((a) => a.time);
      } else if (barberId) {
        ocupados = activas.filter((a) => a.barberId === barberId).map((a) => a.time);
      } else {
        const porHorario = new Map<string, Set<string>>();
        for (const a of activas) {
          // Cita antigua sin barbero: no bloquea a nadie en concreto
          if (!a.barberId) continue;
          const tomados = porHorario.get(a.time) ?? new Set<string>();
          tomados.add(a.barberId);
          porHorario.set(a.time, tomados);
        }
        ocupados = [...porHorario.entries()]
          .filter(([, tomados]) => equipo.every((b) => tomados.has(b.id)))
          .map(([hora]) => hora);
      }

      // Ocupación real por franja, para el panel. `booked` responde a "¿puede
      // el cliente reservar aquí?" y con varios barberos solo se llena cuando
      // no queda ninguno; Gestión de horarios necesita la otra pregunta:
      // "¿qué está pasando a esta hora?".
      const ocupacion: Record<string, { tomados: number; total: number }> = {};
      const total = equipo.length;
      for (const a of activas) {
        const actual = ocupacion[a.time] ?? { tomados: 0, total };
        actual.tomados += 1;
        ocupacion[a.time] = actual;
      }

      const unavailable = Array.from(new Set([...ocupados, ...blocked]));
      return NextResponse.json({ booked: unavailable, blocked, ocupacion });
    } catch {}
  }

  return NextResponse.json({ booked: [], blocked: [] });
}
