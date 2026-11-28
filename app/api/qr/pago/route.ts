import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { isStoreConfigured, store } from '@/lib/server/data';
import { nombreDeArchivo } from '@/lib/server/qrImage';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';

/**
 * QR de cobro de ESTA barbería, sin sesión: lo que ve el cliente para pagarle
 * por transferencia (Nequi/Daviplata) y evitarle a la barbería la comisión de
 * una pasarela. Es solo una imagen, nunca procesa ni ve el pago real — mismo
 * principio que `/api/admin/pago-qr`, pero accesible desde el sitio público.
 *
 * Con `barberId`, se intenta primero el QR de ese barbero y se cae al del
 * negocio si no tiene uno propio (mismo respaldo que ya existía en el panel).
 * 404 si la barbería no configuró ninguno: así el botón del cliente puede
 * ocultarse en vez de mostrar un ícono roto.
 */
export async function GET(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const descarga = searchParams.get('descargar') === '1';

  try {
    const png = barberId
      ? (await store().readBarberPaymentQr(tenantResult.tenant.slug, barberId)) ??
        (await store().readPaymentQr(tenantResult.tenant.slug))
      : await store().readPaymentQr(tenantResult.tenant.slug);

    if (!png) {
      return NextResponse.json({ error: 'Esta barbería no tiene QR de cobro configurado' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `${descarga ? 'attachment' : 'inline'}; filename="qr-pago-${nombreDeArchivo(tenantResult.tenant.slug)}.png"`,
      },
    });
  } catch (error) {
    logger.warn('qr_pago_publico_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo leer el QR' }, { status: 503 });
  }
}
