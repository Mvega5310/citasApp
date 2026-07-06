import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getPool } from '@/lib/server/db';
import { logger } from '@/lib/server/logger';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

function getAppointmentRef(db: FirebaseFirestore.Firestore, tenantSlug: string, id: string) {
  return tenantSlug
    ? db.collection('tenants').doc(tenantSlug).collection('appointments').doc(id)
    : db.collection('appointments').doc(id); // fallback legacy
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';
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

  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const ref = getAppointmentRef(db, tenantSlug, id);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.update({ status, updatedAt: new Date().toISOString() });
        return NextResponse.json({ ok: true, id, status });
      }
    } catch (error) {
      logger.warn('admin_patch_firebase_failed', {
        id, error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE appointments SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status`,
      [status, id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id, status });
  } catch (error) {
    logger.error('admin_patch_postgres_failed', {
      id, error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al actualizar la cita' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';
  const { id } = params;

  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const ref = getAppointmentRef(db, tenantSlug, id);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
        return NextResponse.json({ ok: true, id });
      }
    } catch (error) {
      logger.warn('admin_delete_firebase_failed', {
        id, error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM appointments WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    logger.error('admin_delete_postgres_failed', {
      id, error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al eliminar la cita' }, { status: 500 });
  }
}
