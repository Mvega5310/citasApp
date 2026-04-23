import { NextResponse } from 'next/server';
import { adminAuth, adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { signSession } from '@/lib/server/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña requeridos' }, { status: 400 });
    }

    if (!isFirebaseConfigured) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Firebase API key no configurada' }, { status: 500 });
    }

    // Use Firebase Auth REST API to verify credentials
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    if (!firebaseRes.ok) {
      const err = await firebaseRes.json();
      const code = err?.error?.message ?? '';
      if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
        return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
      }
      if (code.includes('TOO_MANY_ATTEMPTS')) {
        return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const { idToken, localId: uid } = await firebaseRes.json();

    // Verify the ID token with Admin SDK and get full user info
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Error de verificación' }, { status: 401 });
    }

    // Check admin record in Firestore
    const adminDoc = await adminDb().collection('admins').doc(decoded.uid ?? uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 });
    }

    const data = adminDoc.data()!;
    const sessionToken = await signSession({
      uid: decoded.uid,
      email: decoded.email ?? email,
      name: data.name,
      role: data.role ?? 'viewer',
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
