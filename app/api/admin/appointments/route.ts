import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { logger } from '@/lib/server/logger';
import { authorizeAdmin } from '@/lib/server/authorization';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const tenantSlug = auth.tenant.slug;

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

  return NextResponse.json({ error: 'No se pudo obtener las citas' }, { status: 503 });
}
