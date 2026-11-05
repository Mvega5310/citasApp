import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { setPasswordWithToken } from '@/lib/server/auth';
import { hashPassword, passwordProblem } from '@/lib/server/auth/password';
import { dataBackend } from '@/lib/server/data';
import { clientIp, hit, retryAfter } from '@/lib/server/rateLimit';
import { logger } from '@/lib/server/logger';

// Crea o cambia la contraseña con el enlace (un solo uso) que llegó por correo
export async function POST(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;

  // Con Firebase Auth los enlaces llevan a la página de Firebase, no aquí
  if (dataBackend() !== 'postgres') {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 });
  }

  const ipKey = `reset:ip:${clientIp(request)}`;
  if (retryAfter(ipKey, 20) > 0) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
  }

  let token = '';
  let password = '';
  try {
    const body = await request.json();
    token = typeof body.token === 'string' ? body.token : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const admin = await setPasswordWithToken(token, await hashPassword(password));
    if (!admin) {
      hit(ipKey, 60 * 60 * 1000);
      return NextResponse.json(
        { error: 'El enlace no es válido, ya se usó o venció. Pide uno nuevo desde "¿Olvidaste tu contraseña?".' },
        { status: 400 }
      );
    }
    // Solo puede usarse en el panel de su propia barbería
    const sameTenant = admin.tenantSlug === tenantResult.tenant.slug;
    return NextResponse.json({ ok: true, email: admin.email, sameTenant });
  } catch (error) {
    logger.error('password_reset_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo guardar la contraseña' }, { status: 500 });
  }
}
