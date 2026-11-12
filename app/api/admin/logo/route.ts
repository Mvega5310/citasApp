import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';
import { MAX_BYTES, revisarLogo } from '@/lib/server/logoPng';

export const dynamic = 'force-dynamic';

/**
 * Sube el logo de la barbería.
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
    // Corte temprano: no tiene sentido validar en detalle algo descomunal.
    if (bruto.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `La imagen pesa más de ${Math.round(MAX_BYTES / 1024)} KB.` },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(bruto);
    const revision = revisarLogo(bytes);
    if (!revision.ok) return NextResponse.json({ error: revision.error }, { status: 400 });

    await store().writeLogo(auth.tenant.slug, bytes);
    return NextResponse.json({ ok: true, ancho: revision.ancho, alto: revision.alto });
  } catch (error) {
    logger.warn('logo_upload_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo guardar el logo' }, { status: 500 });
  }
}

/** Quitarlo devuelve el monograma con las iniciales, no el logo de otro. */
export async function DELETE(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    await store().deleteLogo(auth.tenant.slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('logo_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo quitar el logo' }, { status: 500 });
  }
}
