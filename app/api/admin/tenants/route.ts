import { NextResponse } from 'next/server';
import { authorizePlatformAdmin } from '@/lib/server/platform';
import { store, TenantExistsError } from '@/lib/server/data';
import { AuthError, appOrigin, auth } from '@/lib/server/auth';
import { sendAdminInvitation } from '@/lib/server/email';
import { emailContextFor, tenantFromSlug } from '@/lib/server/settings';
import { logger } from '@/lib/server/logger';

/** Mismo formato que acepta el resolutor y que valida el CHECK del esquema. */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Nombres que no pueden ser una barbería porque chocarían con la
 * infraestructura: unos son subdominios que ya significan otra cosa, otros se
 * confundirían con rutas de la plataforma, y `www` ya lo trata el resolutor
 * como la barbería por defecto.
 */
const RESERVADOS = new Set([
  'www', 'admin', 'api', 'app', 'mail', 'email', 'smtp', 'ftp', 'cdn', 'static',
  'assets', 'blog', 'docs', 'help', 'soporte', 'support', 'status', 'panel',
  'dashboard', 'login', 'cuenta', 'account', 'billing', 'pago', 'pagos',
  'test', 'staging', 'dev', 'demo-test', 'rsend', 'send', '_acme-challenge',
]);

export async function GET(request: Request) {
  const authorized = await authorizePlatformAdmin(request);
  if (!authorized.ok) return authorized.response;

  try {
    return NextResponse.json({ tenants: await store().listTenants() });
  } catch (error) {
    logger.error('tenants_list_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudieron cargar las barberías' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorized = await authorizePlatformAdmin(request);
  if (!authorized.ok) return authorized.response;

  let slug = '';
  let name = '';
  let adminEmail = '';
  let adminName = '';
  try {
    const body = await request.json();
    slug = String(body.slug ?? '').trim().toLowerCase();
    name = String(body.name ?? '').trim();
    adminEmail = String(body.adminEmail ?? '').trim().toLowerCase();
    adminName = String(body.adminName ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: 'La dirección solo admite minúsculas, números y guiones, y no puede empezar ni terminar en guión.' },
      { status: 400 }
    );
  }
  if (RESERVADOS.has(slug)) {
    return NextResponse.json({ error: `"${slug}" está reservado, elige otra dirección.` }, { status: 400 });
  }
  // El nombre es obligatorio: es lo que ve el cliente en el encabezado y en
  // los correos hasta que la barbería lo cambie en su Configuración.
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: 'El nombre debe tener entre 2 y 60 caracteres.' }, { status: 400 });
  }
  if (!adminEmail.includes('@') || adminEmail.startsWith('@')) {
    return NextResponse.json({ error: 'El correo del administrador no es válido.' }, { status: 400 });
  }
  if (adminName.length < 2) {
    return NextResponse.json({ error: 'Falta el nombre del administrador.' }, { status: 400 });
  }

  try {
    await store().createTenant({ slug, name });
  } catch (error) {
    if (error instanceof TenantExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error('tenant_create_failed', { slug, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo crear la barbería' }, { status: 500 });
  }

  // El enlace apunta a la dirección de la barbería NUEVA, no a la de quien la
  // crea: es donde su admin va a entrar.
  let origin: string;
  try {
    origin = appOrigin(request, slug);
  } catch (error) {
    const msg = error instanceof AuthError ? error.message : 'No se pudo determinar la dirección';
    return NextResponse.json(
      { error: `Barbería creada, pero no se pudo preparar el acceso: ${msg}`, slug },
      { status: 500 }
    );
  }

  let setupLink: string | null = null;
  let expiresIn = '72 horas';
  try {
    const invited = await auth().invite(
      { tenantSlug: slug, email: adminEmail, name: adminName, role: 'admin', createdBy: authorized.session.uid },
      origin
    );
    setupLink = invited.setupLink;
    expiresIn = invited.expiresIn;
  } catch (error) {
    const msg = error instanceof AuthError ? error.message : 'No se pudo crear la cuenta';
    // La barbería queda creada; el admin se puede invitar después desde Equipo.
    return NextResponse.json({ error: `Barbería creada, pero ${msg}`, slug }, { status: 207 });
  }

  let emailSent = false;
  if (setupLink) {
    try {
      // La marca es la de la barbería nueva: el correo sale en su nombre.
      const ctx = await emailContextFor(await tenantFromSlug(slug));
      emailSent = await sendAdminInvitation({
        inviteeName: adminName,
        inviteeEmail: adminEmail,
        inviterName: authorized.session.name,
        role: 'admin',
        setupLink,
        expiresIn,
        brand: ctx.brand,
      });
    } catch (error) {
      logger.warn('tenant_invite_email_failed', {
        slug,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  logger.info('tenant_created', { slug, by: authorized.session.uid, emailSent });
  return NextResponse.json({ ok: true, slug, url: origin, emailSent });
}
