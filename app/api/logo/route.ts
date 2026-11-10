import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

/**
 * Logo del negocio, en el tamaño pedido.
 *
 * Antes esto renderizaba `public/LogoBr.jpg` con ImageResponse en el runtime
 * edge, y el original pesa 1,78 MB a 2048×2048: el generador no lograba
 * incrustarlo y devolvía un PNG de 559 bytes, o sea un cuadro en blanco. Se
 * veía así en el encabezado del cliente, en el panel y —lo más evidente— al
 * añadir la app a la pantalla de inicio.
 *
 * Ahora sirve PNG ya redimensionados y comiteados: sin render en cada
 * petición, y sin traer 1,78 MB para pintar 36 píxeles.
 */
const TAMANOS = [64, 180, 192, 512] as const;

/** El más pequeño que cubra lo pedido, para no escalar hacia arriba. */
function elegirTamano(pedido: number): number {
  return TAMANOS.find((t) => t >= pedido) ?? TAMANOS[TAMANOS.length - 1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pedido = Number.parseInt(searchParams.get('size') ?? '192', 10);
  const size = elegirTamano(Number.isNaN(pedido) ? 192 : Math.max(pedido, 1));

  try {
    const archivo = path.join(process.cwd(), 'public', 'icons', `logo-${size}.png`);
    const png = await readFile(archivo);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // Archivo estático comiteado: se puede cachear con holgura.
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Logo no disponible' }, { status: 404 });
  }
}
