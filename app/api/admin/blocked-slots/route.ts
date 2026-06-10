import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';

function blockedSlotDoc(db: FirebaseFirestore.Firestore, tenantSlug: string, date: string) {
  const base = tenantSlug
    ? db.collection('tenants').doc(tenantSlug).collection('blocked_slots')
    : db.collection('blocked_slots');
  return base.doc(date);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  if (!isFirebaseConfigured) {
    return NextResponse.json({ blocked: [] });
  }

  try {
    const db = adminDb();
    const snap = await blockedSlotDoc(db, tenantSlug, date).get();
    const blocked: string[] = snap.exists ? (snap.data()?.slots ?? []) : [];
    return NextResponse.json({ blocked });
  } catch {
    return NextResponse.json({ blocked: [] });
  }
}

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';

  try {
    const { date, slots, action } = (await request.json()) as {
      date: string;
      slots: string[];
      action: 'block' | 'unblock';
    };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: 'slots debe ser un arreglo no vacío' }, { status: 400 });
    }

    if (action !== 'block' && action !== 'unblock') {
      return NextResponse.json({ error: 'action debe ser block o unblock' }, { status: 400 });
    }

    if (!isFirebaseConfigured) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const db = adminDb();
    const docRef = blockedSlotDoc(db, tenantSlug, date);
    const snap = await docRef.get();
    const current: string[] = snap.exists ? (snap.data()?.slots ?? []) : [];

    const updated =
      action === 'block'
        ? Array.from(new Set([...current, ...slots])).sort()
        : current.filter((s) => !slots.includes(s));

    if (updated.length === 0) {
      if (snap.exists) await docRef.delete();
    } else {
      await docRef.set({ slots: updated, updatedAt: new Date().toISOString() });
    }

    return NextResponse.json({ ok: true, blocked: updated });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar los horarios' }, { status: 500 });
  }
}
