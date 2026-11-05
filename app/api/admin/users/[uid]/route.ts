import { NextResponse } from 'next/server';
import { store } from '@/lib/server/data';
import { authorizeAdmin } from '@/lib/server/authorization';
import { auth } from '@/lib/server/auth';

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  const authz = await authorizeAdmin(request, { role: 'admin' });
  if (!authz.ok) return authz.response;
  const { session } = authz;
  const tenantSlug = authz.tenant.slug;

  if (!auth().isConfigured()) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  try {
    const target = await store().getAdmin(params.uid);
    if (!target || target.tenantSlug !== tenantSlug) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { name, role } = await request.json();
    const update: { name?: string; role?: 'admin' | 'viewer' } = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      update.name = name.trim();
    }
    if (role && ['admin', 'viewer'].includes(role)) {
      update.role = role as 'admin' | 'viewer';
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    // Cannot change own role
    if (update.role && params.uid === session.uid) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });
    }

    await store().updateAdmin(params.uid, update);

    if (update.name) {
      await auth().renameAccount(params.uid, update.name);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { uid: string } }) {
  const authz = await authorizeAdmin(request, { role: 'admin' });
  if (!authz.ok) return authz.response;
  const { session } = authz;
  const tenantSlug = authz.tenant.slug;

  if (params.uid === session.uid) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
  }

  if (!auth().isConfigured()) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  try {
    const target = await store().getAdmin(params.uid);
    if (!target || target.tenantSlug !== tenantSlug) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    await auth().deleteAccount(params.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
