import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getPool } from '@/lib/server/db';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';

  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const col = tenantSlug
        ? db.collection('tenants').doc(tenantSlug).collection('appointments')
        : db.collection('appointments'); // fallback colección legacy

      const snapshot = await col.get();
      const rows = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
        );

      return NextResponse.json({ rows, count: rows.length });
    } catch (error) {
      logger.warn('admin_appointments_firebase_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  // PostgreSQL fallback
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM appointments ORDER BY created_at DESC`
    );

    const rows = result.rows.map((r) => ({
      id: r.id,
      serviceId: r.service_id,
      serviceName: r.service_name,
      clientName: r.client_name,
      clientEmail: r.client_email,
      clientWhatsApp: r.client_whatsapp,
      date: r.appointment_date,
      time: r.appointment_time,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    logger.error('admin_appointments_postgres_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      { error: 'No se pudo obtener las citas' },
      { status: 503 }
    );
  }
}
