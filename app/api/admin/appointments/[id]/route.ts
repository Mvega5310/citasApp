import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { authorizeAdmin } from '@/lib/server/authorization';
import { SlotTakenError, isStoreConfigured, store } from '@/lib/server/data';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const { status } = body;
  if (!status || !VALID_STATUSES.includes(status as AppointmentStatus)) {
    return NextResponse.json(
      { error: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const updated = await store().updateAppointment(auth.tenant.slug, id, { status: status as AppointmentStatus });
    if (!updated) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true, id, status });
  } catch (error) {
    // Reactivar una cita en un horario que ya tiene otra cita activa
    if (error instanceof SlotTakenError) {
      return NextResponse.json(
        { error: 'Ya hay otra cita activa en ese horario. Cancélala o cambia su estado primero.' },
        { status: 409 }
      );
    }
    logger.warn('admin_patch_failed', { id, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Error al actualizar la cita' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = params;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const deleted = await store().deleteAppointment(auth.tenant.slug, id);
    if (!deleted) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    logger.warn('admin_delete_failed', { id, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Error al eliminar la cita' }, { status: 500 });
  }
}
