import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { auth, appOrigin } from '@/lib/server/auth';
import { sendPasswordLinkEmail } from '@/lib/server/email';
import { emailContextFor } from '@/lib/server/settings';
import { clientIp, hit, retryAfter } from '@/lib/server/rateLimit';
import { logger } from '@/lib/server/logger';

const HOUR = 60 * 60 * 1000;
// Respuesta idéntica exista o no la cuenta: no revela qué correos están registrados
const GENERIC = {
  ok: true,
  message: 'Si el correo pertenece a un administrador, recibirás un enlace en unos minutos.',
};

// "¿Olvidaste tu contraseña?": envía un enlace de un solo uso al correo del admin
export async function POST(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenant = tenantResult.tenant;

  let email = '';
  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ingresa un correo válido' }, { status: 400 });
  }

  // Máximo 3 solicitudes por correo y 10 por IP cada hora (evita usarlo para enviar spam)
  const emailKey = `forgot:${tenant.slug}:${email}`;
  const ipKey = `forgot:${tenant.slug}:ip:${clientIp(request)}`;
  if (retryAfter(emailKey, 3) > 0 || retryAfter(ipKey, 10) > 0) {
    return NextResponse.json(GENERIC);
  }
  hit(emailKey, HOUR);
  hit(ipKey, HOUR);

  if (!auth().isConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const result = await auth().resetLink(tenant.slug, email, appOrigin(request, tenant.slug));
    if (result) {
      await sendPasswordLinkEmail({
        name: result.admin.name,
        email: result.admin.email,
        link: result.link,
        purpose: result.purpose,
        expiresIn: result.expiresIn,
        brand: (await emailContextFor(tenant)).brand,
      });
    }
  } catch (error) {
    logger.error('password_forgot_failed', { error: error instanceof Error ? error.message : 'unknown' });
  }

  return NextResponse.json(GENERIC);
}

