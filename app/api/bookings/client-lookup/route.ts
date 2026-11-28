import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { isStoreConfigured, store } from '@/lib/server/data';
import { clientIp, hit, retryAfter } from '@/lib/server/rateLimit';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINUTE = 60 * 1000;

/**
 * Autocompletar a un cliente recurrente: con solo el correo que ya usó antes
 * en ESTA barbería, se le devuelven su nombre y su WhatsApp para no volver a
 * teclearlos. Nunca cruza barberías (un cliente de Darlyn no debe aparecer
 * reconocido en la barbería de otro).
 *
 * Solo nombre y WhatsApp, nunca el historial de citas, y limitado por IP: no
 * es un dato súper sensible, pero sí personal, y sin límite cualquiera podría
 * usarlo para probar correos al azar.
 */
export async function GET(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ found: false });
  }

  const ipKey = `client-lookup:${tenantResult.tenant.slug}:${clientIp(request)}`;
  if (retryAfter(ipKey, 20) > 0) {
    return NextResponse.json({ found: false });
  }
  hit(ipKey, 10 * MINUTE);

  if (!isStoreConfigured()) {
    return NextResponse.json({ found: false });
  }

  try {
    const cliente = await store().findRecentClientByEmail(tenantResult.tenant.slug, email);
    if (!cliente) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, clientName: cliente.clientName, clientWhatsApp: cliente.clientWhatsApp });
  } catch (error) {
    logger.warn('client_lookup_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ found: false });
  }
}
