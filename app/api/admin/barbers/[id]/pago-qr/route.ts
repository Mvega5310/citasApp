import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';
import { MAX_BYTES, revisarLogo } from '@/lib/server/logoPng';
import { barberoDeLaCuenta } from '@/lib/server/alcance';
import type { SessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/**
 * QR de cobro de un barbero concreto. Solo una imagen -mismo patrón que el
 * logo-, la app nunca procesa ni ve el pago real.
 *
 * Quién puede subir o quitar el suyo: un admin, para cualquier barbero -los
 * administra-, o la propia cuenta si está vinculada a ESE barbero -lo que
 * pidió Marcos: que el barbero cargue el suyo sin depender de un admin-.
 * Nadie más, ni un viewer sin vincular.
 */
async function puedeAdministrar(session: SessionUser, barberId: string) {
  if (session.role === 'admin') return true;
  const miBarbero = await barberoDeLaCuenta(session);
  return miBarbero === barberId;
}

export async function GET(request: Request, { params }: Ctx) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const png = await store().readBarberPaymentQr(auth.tenant.slug, params.id);
    if (!png) return NextResponse.json({ error: 'No hay QR de pago todavía' }, { status: 404 });
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (error) {
    logger.warn('barber_pago_qr_read_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo leer el QR' }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (!(await puedeAdministrar(auth.session, params.id))) {
    return NextResponse.json({ error: 'No puedes cambiar el QR de otro barbero' }, { status: 403 });
  }

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const barberos = await store().listBarbers(auth.tenant.slug);
    if (!barberos.some((b) => b.id === params.id)) {
      return NextResponse.json({ error: 'Ese barbero no existe en esta barbería' }, { status: 404 });
    }

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

    await store().writeBarberPaymentQr(auth.tenant.slug, params.id, bytes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('barber_pago_qr_upload_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo guardar el QR' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (!(await puedeAdministrar(auth.session, params.id))) {
    return NextResponse.json({ error: 'No puedes cambiar el QR de otro barbero' }, { status: 403 });
  }

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    await store().deleteBarberPaymentQr(auth.tenant.slug, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('barber_pago_qr_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo quitar el QR' }, { status: 500 });
  }
}
