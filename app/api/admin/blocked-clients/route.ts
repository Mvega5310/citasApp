import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RAZON_MAX = 200;

/** Quién no puede reservar solo: lista por barbería, referenciada por correo. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) return NextResponse.json({ bloqueados: [] });

  try {
    return NextResponse.json({ bloqueados: await store().listBlockedClients(auth.tenant.slug) });
  } catch (error) {
    logger.warn('blocked_clients_list_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo cargar la lista' }, { status: 503 });
  }
}

/**
 * Bloquea o desbloquea un correo. Solo admin: decidir quién puede o no
 * reservar es una decisión del negocio, no de quien solo mira el panel.
 */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  let body: { email?: unknown; reason?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 });
  }

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  const action = body.action === 'unblock' ? 'unblock' : 'block';

  try {
    if (action === 'unblock') {
      await store().unblockClient(auth.tenant.slug, email);
      logger.info('client_unblocked', { tenant: auth.tenant.slug, by: auth.session.uid });
      return NextResponse.json({ ok: true });
    }

    const reason = String(body.reason ?? '').trim().slice(0, RAZON_MAX);
    await store().blockClient(auth.tenant.slug, email, reason, auth.session.name || auth.session.uid);
    logger.info('client_blocked', { tenant: auth.tenant.slug, by: auth.session.uid });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('blocked_clients_write_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}
