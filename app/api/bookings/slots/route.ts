import { NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getPool } from '@/lib/server/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const snap = await db
        .collection('appointments')
        .where('date', '==', date)
        .get();
      const booked = snap.docs
        .filter((d) => ['pending', 'confirmed'].includes(d.data().status))
        .map((d) => d.data().time as string);
      return NextResponse.json({ booked });
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
    return NextResponse.json({ booked });
  } catch {
    return NextResponse.json({ booked: [] });
  }
}
