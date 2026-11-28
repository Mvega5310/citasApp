import { NextResponse } from 'next/server';
import { store } from '@/lib/server/data';
import { validarSlug } from '@/lib/server/tenantSlug';
import { generarTokenRegistro } from '@/lib/server/registroToken';
import { sendRegistroVerificationEmail } from '@/lib/server/email';
import { clientIp, hit, retryAfter } from '@/lib/server/rateLimit';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';

const HOUR = 60 * 60 * 1000;

/**
 * Registro directo de una barbería nueva, sin que Marcos la cree a mano.
 *
 * No crea nada todavía: solo valida y manda un correo de verificación con un
 * enlace firmado (ver `registroToken.ts`). La barbería se crea recién cuando
 * se confirma ese correo, en `/registro/confirmar`. Así alguien que escriba
 * mal su correo (muy fácil desde el celular) no deja una barbería fantasma
 * sin nadie que pueda entrar a ella.
 */
export async function POST(request: Request) {
  let name = '';
  let slug = '';
  let adminName = '';
  let adminEmail = '';
  try {
    const body = await request.json();
    name = String(body.name ?? '').trim();
    slug = String(body.slug ?? '').trim().toLowerCase();
    adminName = String(body.adminName ?? '').trim();
    adminEmail = String(body.adminEmail ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: 'El nombre debe tener entre 2 y 60 caracteres.' }, { status: 400 });
  }
  const errorSlug = validarSlug(slug);
  if (errorSlug) return NextResponse.json({ error: errorSlug }, { status: 400 });
  if (adminName.length < 2) {
    return NextResponse.json({ error: 'Falta tu nombre.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: 'Ingresa un correo válido.' }, { status: 400 });
  }

  // Evita que el formulario se use para bombardear un correo o para que un
  // bot pruebe direcciones en bucle.
  const ipKey = `registro:ip:${clientIp(request)}`;
  const emailKey = `registro:email:${adminEmail}`;
  if (retryAfter(ipKey, 8) > 0 || retryAfter(emailKey, 3) > 0) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' },
      { status: 429 }
    );
  }
  hit(ipKey, HOUR);
  hit(emailKey, HOUR);

  try {
    const existente = await store().lookupTenant(slug);
    if (existente.found) {
      return NextResponse.json({ error: `Ya existe una barbería con la dirección "${slug}".` }, { status: 409 });
    }
  } catch (error) {
    logger.error('registro_lookup_failed', { slug, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo comprobar la dirección, intenta de nuevo.' }, { status: 503 });
  }

  const token = await generarTokenRegistro({ slug, name, adminName, adminEmail });
  // El origen es el de ESTA petición (donde vive /registro), nunca el de la
  // barbería nueva: todavía no existe, así que no tiene subdominio propio.
  const origin =
    process.env.NODE_ENV === 'production'
      ? (process.env.APP_URL?.replace(/\/$/, '') ?? new URL(request.url).origin)
      : new URL(request.url).origin;
  const confirmLink = `${origin}/registro/confirmar?token=${token}`;

  const emailSent = await sendRegistroVerificationEmail({
    adminName,
    adminEmail,
    businessName: name,
    confirmLink,
    expiresIn: '24 horas',
  });

  if (!emailSent) {
    logger.warn('registro_email_failed', { slug, adminEmail });
    return NextResponse.json(
      { error: 'No se pudo enviar el correo de verificación. Intenta de nuevo en unos minutos.' },
      { status: 503 }
    );
  }

  logger.info('registro_solicitado', { slug, adminEmail });
  return NextResponse.json({ ok: true });
}
