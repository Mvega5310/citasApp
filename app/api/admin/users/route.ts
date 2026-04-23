import { NextResponse } from 'next/server';
import { adminAuth, adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getSessionUser } from '@/lib/server/session';
import { sendAdminInvitation } from '@/lib/server/email';
import admin from 'firebase-admin';
import crypto from 'crypto';

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  if (!isFirebaseConfigured) return NextResponse.json([]);

  const snap = await adminDb().collection('admins').orderBy('createdAt', 'asc').get();
  const users = snap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  if (!isFirebaseConfigured) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  try {
    const { email, name, role } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'email y nombre son requeridos' }, { status: 400 });
    }
    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Create Firebase Auth user with a random temp password (will be reset via email)
    const tempPassword = crypto.randomBytes(24).toString('base64');
    let user;
    try {
      user = await adminAuth().createUser({ email, password: tempPassword, displayName: name });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear usuario';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Save admin record in Firestore
    await adminDb().collection('admins').doc(user.uid).set({
      email,
      name,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: session.uid,
      invited: true,
    });

    // Generate password setup link (Firebase password reset = set initial password)
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    let setupLink: string;
    try {
      setupLink = await adminAuth().generatePasswordResetLink(email, {
        url: `${origin}/admin/login`,
      });
    } catch {
      // If link generation fails, still create the user but warn
      return NextResponse.json({
        ok: true,
        uid: user.uid,
        emailSent: false,
        warning: 'Usuario creado pero no se pudo generar el enlace de invitación.',
      });
    }

    // Send invitation email
    const emailSent = await sendAdminInvitation({
      inviteeName: name,
      inviteeEmail: email,
      inviterName: session.name,
      role,
      setupLink,
    });

    return NextResponse.json({ ok: true, uid: user.uid, emailSent });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
