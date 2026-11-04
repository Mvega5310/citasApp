import { NextResponse } from 'next/server';
import { adminAuth, adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { adminTenantOf, authorizeAdmin } from '@/lib/server/authorization';

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const tenantSlug = auth.tenant.slug;

  if (!isFirebaseConfigured) return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });

  try {
    const target = await adminDb().collection('admins').doc(params.uid).get();
    if (!target.exists || adminTenantOf(target.data()) !== tenantSlug) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { name, role } = await request.json();
    const update: Record<string, string> = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      update.name = name.trim();
    }
    if (role && ['admin', 'viewer'].includes(role)) {
      update.role = role;
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    // Cannot change own role
    if (update.role && params.uid === session.uid) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });
    }

    await adminDb().collection('admins').doc(params.uid).set(update, { merge: true });

    if (update.name) {
      await adminAuth().updateUser(params.uid, { displayName: update.name });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { uid: string } }) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const tenantSlug = auth.tenant.slug;

  if (params.uid === session.uid) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
  }

  if (!isFirebaseConfigured) return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });

  try {
    const target = await adminDb().collection('admins').doc(params.uid).get();
    if (!target.exists || adminTenantOf(target.data()) !== tenantSlug) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    await adminAuth().deleteUser(params.uid);
    await adminDb().collection('admins').doc(params.uid).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
