import { NextResponse } from 'next/server';
import { signSession } from '@/lib/server/session';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { AuthError, auth } from '@/lib/server/auth';
import { clear, clientIp, hit, retryAfter } from '@/lib/server/rateLimit';
import { logger } from '@/lib/server/logger';

// Intentos fallidos permitidos cada 15 minutos
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export async function POST(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;

  let email: string;
  let password: string;
  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Correo y contraseña requeridos' }, { status: 400 });
  }

  if (!auth().isConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  const emailKey = `login:${tenantSlug}:${email}`;
  const ipKey = `login:${tenantSlug}:ip:${clientIp(request)}`;
  const wait = Math.max(retryAfter(emailKey, MAX_PER_EMAIL), retryAfter(ipKey, MAX_PER_IP));
  if (wait > 0) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${Math.ceil(wait / 60)} minuto(s) e intenta de nuevo.` },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  try {
    const admin = await auth().login(tenantSlug, email, password);
    clear(emailKey);

    const sessionToken = await signSession({
      uid: admin.id,
      email: admin.email || email,
      name: admin.name,
      role: admin.role ?? 'viewer',
      tenantSlug,
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
    if (error instanceof AuthError) {
      if (error.status === 401 || error.status === 403) {
        hit(emailKey, WINDOW_MS);
        hit(ipKey, WINDOW_MS);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('login_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
