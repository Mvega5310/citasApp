import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isStoreConfigured, store } from '@/lib/server/data';
import { resolveTenant, DEFAULT_TENANT_SLUG } from '@/lib/server/tenant';
import { readSettings } from '@/lib/server/settings';
import { monogramaSvg } from '@/lib/server/logoPng';

/**
 * Logo de **la barbería de esta petición**, en el tamaño pedido.
 *
 * Servía un PNG fijo de `public/icons/`, así que el logo de Marcos BarberShop
 * salía en todas las barberías de la plataforma. Ahora sale del logo que cada
 * una subió (migración 008) y, mientras no suba ninguno, de un monograma con
 * sus iniciales: servirle el PNG comiteado no era un respaldo, era el logo de
 * otro negocio.
 *
 * Ese PNG sigue siendo el respaldo **solo** de la barbería por defecto, que es
 * de quien es ese logo.
 */
export const dynamic = 'force-dynamic';

const TAMANOS = [64, 180, 192, 512] as const;

/** El más pequeño que cubra lo pedido, para no escalar hacia arriba. */
function elegirTamano(pedido: number): number {
  return TAMANOS.find((t) => t >= pedido) ?? TAMANOS[TAMANOS.length - 1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pedido = Number.parseInt(searchParams.get('size') ?? '192', 10);
  const size = elegirTamano(Number.isNaN(pedido) ? 192 : Math.max(pedido, 1));

  const tenant = await resolveTenant(request.headers.get('x-tenant-slug'));
  const slug = tenant.ok ? tenant.tenant.slug : DEFAULT_TENANT_SLUG;

  // 1 · Su propio logo, si lo subió
  if (isStoreConfigured()) {
    try {
      const propio = await store().readLogo(slug);
      if (propio) {
        const etag = `"${createHash('sha1').update(slug + propio.updatedAt).digest('hex')}"`;
        if (request.headers.get('if-none-match') === etag) {
          return new NextResponse(null, { status: 304 });
        }
        return new NextResponse(new Uint8Array(propio.png), {
          headers: {
            'Content-Type': 'image/png',
            ETag: etag,
            // Una hora, pero con ETag: al cambiar el logo el navegador
            // revalida barato en vez de quedarse un día con el viejo.
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        });
      }
    } catch {
      // Si la base falla se cae al respaldo, en vez de dejar la página sin logo.
    }
  }

  // 2 · La barbería por defecto conserva el PNG comiteado: es suyo
  if (slug === DEFAULT_TENANT_SLUG) {
    try {
      const archivo = path.join(process.cwd(), 'public', 'icons', `logo-${size}.png`);
      const png = await readFile(archivo);
      return new NextResponse(new Uint8Array(png), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    } catch {
      // Sigue al monograma
    }
  }

  // 3 · Monograma con sus iniciales mientras no suba el suyo
  let nombre = 'BeautyTurno';
  if (tenant.ok) {
    try {
      nombre = (await readSettings(tenant.tenant)).salonName || nombre;
    } catch {
      // Con el nombre genérico basta para pintar algo
    }
  }
  return new NextResponse(monogramaSvg(nombre), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
