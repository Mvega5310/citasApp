import { NextResponse } from 'next/server';
import { adminAuth, adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import admin from 'firebase-admin';

// One-time endpoint to create the first admin account.
// Protected by ADMIN_SECRET so only someone with server access can use it.
export async function POST(request: Request) {
  try {
    const { email, password, name, setupKey } = await request.json();

    if (setupKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Clave de setup incorrecta' }, { status: 403 });
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'email, password y name son requeridos' }, { status: 400 });
    }

    if (!isFirebaseConfigured) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
    }

    // Check if any admin already exists
    const existing = await adminDb().collection('admins').limit(1).get();
    if (!existing.empty) {
      return NextResponse.json(
        { error: 'Ya existe al menos un administrador. Usa la página de Equipo para agregar más.' },
        { status: 409 }
      );
    }

    // Create Firebase Auth user
    let user;
    try {
      user = await adminAuth().createUser({ email, password, displayName: name });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear usuario';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Save admin record in Firestore
    await adminDb().collection('admins').doc(user.uid).set({
      email,
      name,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, uid: user.uid, message: `Admin "${name}" creado correctamente.` });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
