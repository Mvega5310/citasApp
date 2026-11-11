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

    const { name, role, barberId } = await request.json();
    const update: { name?: string; role?: 'admin' | 'viewer'; barberId?: string | null } = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      update.name = name.trim();
    }
    if (role && ['admin', 'viewer'].includes(role)) {
      update.role = role as 'admin' | 'viewer';
    }
    // Vincular la cuenta a un barbero la limita a sus propias citas.
    // `null` o cadena vacía desvinculan: vuelve a ver todo el local.
    if (barberId !== undefined) {
      if (barberId === null || barberId === '') {
        update.barberId = null;
      } else if (typeof barberId !== 'string') {
        return NextResponse.json({ error: 'Barbero inválido' }, { status: 400 });
      } else {
        const barberos = await store().listBarbers(tenantSlug);
        if (!barberos.some((b) => b.id === barberId)) {
          // Se valida contra la barbería de la sesión: así una cuenta no se
          // puede vincular al barbero de otro local.
          return NextResponse.json({ error: 'Ese barbero no existe en esta barbería' }, { status: 400 });
        }
        const ocupado = (await store().listAdmins(tenantSlug)).find(
          (a) => a.barberId === barberId && a.id !== params.uid
        );
        if (ocupado) {
          return NextResponse.json(
            { error: `${ocupado.name} ya está vinculado a ese barbero.` },
            { status: 409 }
          );
        }
        update.barberId = barberId;
      }
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    // Cannot change own role
    if (update.role && params.uid === session.uid) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });
    }
    // Ni su propio vínculo: si pudiera, un barbero se desvincularía solo y
    // vería la agenda de sus compañeros. Lo cambia otro administrador.
    if (update.barberId !== undefined && params.uid === session.uid) {
      return NextResponse.json(
        { error: 'No puedes cambiar a qué barbero está vinculada tu propia cuenta.' },
        { status: 400 }
      );
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
