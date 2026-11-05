import { NextResponse } from 'next/server';
import { adminAuth, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { store } from '@/lib/server/data';
import { resolveRequestTenant } from '@/lib/server/tenant';

// One-time endpoint to create the first admin account.
// Protected by ADMIN_SECRET so only someone with server access can use it.
export async function POST(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;

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

    // ¿Ya existe algún admin en esta barbería?
    if (await store().hasAdmins(tenantSlug)) {
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

    // Registro del primer admin de esta barbería
    await store().createAdmin({
      id: user.uid,
      email: String(email).trim().toLowerCase(),
      name,
      role: 'admin',
      tenantSlug,
    });

    return NextResponse.json({ ok: true, uid: user.uid, message: `Admin "${name}" creado correctamente.` });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
