import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';
import { MAX_BYTES, revisarLogo } from '@/lib/server/logoPng';

export const dynamic = 'force-dynamic';

/**
 * QR de cobro del negocio: Nequi/Daviplata o lo que use, para evitar la
 * comisión de una pasarela. Es solo una imagen -mismo patrón que el logo-,
 * la app nunca procesa ni ve un pago real. Sirve de respaldo cuando un
 * barbero concreto no tiene el suyo propio (ver /api/admin/barbers/[id]/pago-qr).
 *
 * Sin ruta pública todavía: se consulta logueado, para que cualquier cuenta
 * del panel pueda mostrarlo en el momento (p. ej. en el teléfono, frente al
 * cliente), no para insertarlo en el sitio público ni en el flujo de reserva.
 */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const png = await store().readPaymentQr(auth.tenant.slug);
    if (!png) return NextResponse.json({ error: 'No hay QR de pago todavía' }, { status: 404 });
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (error) {
    logger.warn('pago_qr_read_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo leer el QR' }, { status: 503 });
  }
}

/**
 * Sube el QR de cobro del negocio.
 *
 * Llega un PNG ya redimensionado por el navegador. Aun así se revisan los
 * bytes aquí: lo que manda el navegador no es de fiar, y un `Content-Type`
 * lo escribe quien hace la petición.
 */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const bruto = await request.arrayBuffer();
    if (bruto.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `La imagen pesa más de ${Math.round(MAX_BYTES / 1024)} KB.` },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(bruto);
    const revision = revisarLogo(bytes);
    if (!revision.ok) return NextResponse.json({ error: revision.error }, { status: 400 });

    await store().writePaymentQr(auth.tenant.slug, bytes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('pago_qr_upload_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo guardar el QR' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    await store().deletePaymentQr(auth.tenant.slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('pago_qr_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo quitar el QR' }, { status: 500 });
  }
}
