import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getPool } from '@/lib/server/db';

async function fetchBlockedSlots(
  db: FirebaseFirestore.Firestore,
  tenantSlug: string,
  date: string,
): Promise<string[]> {
  try {
    const base = tenantSlug
      ? db.collection('tenants').doc(tenantSlug).collection('blocked_slots')
      : db.collection('blocked_slots');
    const snap = await base.doc(date).get();
    return snap.exists ? (snap.data()?.slots ?? []) : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const col = tenantSlug
        ? db.collection('tenants').doc(tenantSlug).collection('appointments')
        : db.collection('appointments');

      const [snap, blocked] = await Promise.all([
        col.where('date', '==', date).get(),
        fetchBlockedSlots(db, tenantSlug, date),
      ]);

      const booked = snap.docs
        .filter((d) => ['pending', 'confirmed'].includes(d.data().status))
        .map((d) => d.data().time as string);

      const unavailable = Array.from(new Set([...booked, ...blocked]));
      return NextResponse.json({ booked: unavailable, blocked });
    } catch {}
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT appointment_time FROM appointments
       WHERE appointment_date = $1 AND status IN ('pending', 'confirmed')`,
      [date]
    );
    const booked = result.rows.map((r) => r.appointment_time as string);
    return NextResponse.json({ booked, blocked: [] });
  } catch {
    return NextResponse.json({ booked: [], blocked: [] });
  }
}
