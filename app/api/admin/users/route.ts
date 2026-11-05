import { NextResponse } from 'next/server';
import { isStoreConfigured, store } from '@/lib/server/data';
import { authorizeAdmin } from '@/lib/server/authorization';
import { AuthError, appOrigin, auth } from '@/lib/server/auth';
import { sendAdminInvitation } from '@/lib/server/email';
import { emailContextFor } from '@/lib/server/settings';

export async function GET(request: Request) {
  const authz = await authorizeAdmin(request, { role: 'admin' });
  if (!authz.ok) return authz.response;
  const { session } = authz;
  const tenantSlug = authz.tenant.slug;

  if (!isStoreConfigured()) return NextResponse.json([]);

  // Solo los admins de esta barbería
  const users = (await store().listAdmins(tenantSlug)).map(({ id, ...a }) => ({ uid: id, ...a }));
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const authz = await authorizeAdmin(request, { role: 'admin' });
  if (!authz.ok) return authz.response;
  const { session } = authz;
  const tenantSlug = authz.tenant.slug;

  if (!auth().isConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const { email, name, role } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'email y nombre son requeridos' }, { status: 400 });
    }
    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    let invited: { adminId: string; setupLink: string | null; expiresIn: string };
    try {
      invited = await auth().invite(
        { tenantSlug, email: String(email).trim(), name, role, createdBy: session.uid },
        appOrigin(request, tenantSlug)
      );
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
      throw e;
    }
    const { adminId, setupLink } = invited;
    if (!setupLink) {
      return NextResponse.json({
        ok: true,
        uid: adminId,
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
      expiresIn: invited.expiresIn,
      brand: (await emailContextFor(authz.tenant)).brand,
    });

    return NextResponse.json({ ok: true, uid: adminId, emailSent });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
