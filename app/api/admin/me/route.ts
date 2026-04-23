import { NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getSessionUser } from '@/lib/server/session';

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (isFirebaseConfigured) {
    try {
      const doc = await adminDb().collection('admins').doc(session.uid).get();
      if (doc.exists) {
        const data = doc.data()!;
        return NextResponse.json({
          uid: session.uid,
          name: data.name || session.name,
          email: data.email || session.email,
          role: data.role || session.role,
        });
      }
    } catch {}
  }

  return NextResponse.json({
    uid: session.uid,
    name: session.name,
    email: session.email,
    role: session.role,
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }

    const trimmed = name.trim();

    if (isFirebaseConfigured) {
      await adminDb().collection('admins').doc(session.uid).set(
        { name: trimmed },
        { merge: true }
      );
    }

    return NextResponse.json({ ok: true, name: trimmed });
  } catch {
    return NextResponse.json({ error: 'Error al guardar el perfil' }, { status: 500 });
  }
}
