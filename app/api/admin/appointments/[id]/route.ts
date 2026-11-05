import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { logger } from '@/lib/server/logger';
import { authorizeAdmin } from '@/lib/server/authorization';

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
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const tenantSlug = auth.tenant.slug;
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

  return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const tenantSlug = auth.tenant.slug;
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

  return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
}
