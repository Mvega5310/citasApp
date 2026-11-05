import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { ACTIVE_STATUSES, isStoreConfigured, store } from '@/lib/server/data';

// Horarios no disponibles de un día: citas activas + horarios bloqueados por el negocio
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  if (isStoreConfigured()) {
    try {
      const [sameDay, blocked] = await Promise.all([
        store().appointmentsOnDate(tenantSlug, date),
        store().blockedSlots(tenantSlug, date).catch(() => [] as string[]),
      ]);
      const booked = sameDay.filter((a) => ACTIVE_STATUSES.includes(a.status)).map((a) => a.time);
      const unavailable = Array.from(new Set([...booked, ...blocked]));
      return NextResponse.json({ booked: unavailable, blocked });
    } catch {}
  }

  return NextResponse.json({ booked: [], blocked: [] });
}
