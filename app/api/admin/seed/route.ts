import { NextResponse } from 'next/server';
import { store } from '@/lib/server/data';
import { AuthError, auth } from '@/lib/server/auth';
import { passwordProblem } from '@/lib/server/auth/password';
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

    if (!auth().isConfigured()) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    // ¿Ya existe algún admin en esta barbería?
    if (await store().hasAdmins(tenantSlug)) {
      return NextResponse.json(
        { error: 'Ya existe al menos un administrador. Usa la página de Equipo para agregar más.' },
        { status: 409 }
      );
    }

    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    let adminId: string;
    try {
      ({ adminId } = await auth().createWithPassword(
        { tenantSlug, email: String(email).trim(), name, role: 'admin' },
        password
      ));
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
      throw e;
    }

    return NextResponse.json({ ok: true, uid: adminId, message: `Admin "${name}" creado correctamente.` });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
