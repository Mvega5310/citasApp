import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { appOrigin, AuthError } from '@/lib/server/auth';
import { generarQrPng } from '@/lib/server/qrImage';

/**
 * Código QR de la página pública de la barbería, para imprimir y pegar en el local.
 *
 * La dirección la arma el servidor a partir de la barbería de la sesión: esta
 * ruta NO acepta una URL por parámetro. Si lo hiciera, cualquiera con una
 * cuenta tendría un generador de códigos QR alojado en este dominio, que es
 * justo lo que se necesita para montar una estafa con la confianza del dominio.
 *
 * Lo único que se acepta de fuera es a cuál de las páginas propias apunta, y
 * solo de esta lista.
 */
const PAGINAS: Record<string, string> = {
  inicio: '/',
  reservar: '/reservar',
  servicios: '/servicios',
  contacto: '/contacto',
};

export async function GET(request: Request) {
  const authorized = await authorizeAdmin(request);
  if (!authorized.ok) return authorized.response;

  const { searchParams } = new URL(request.url);
  const pagina = searchParams.get('pagina') ?? 'inicio';
  const ruta = PAGINAS[pagina];
  if (!ruta) {
    return NextResponse.json(
      { error: `Página no válida. Opciones: ${Object.keys(PAGINAS).join(', ')}` },
      { status: 400 }
    );
  }

  let destino: string;
  try {
    destino = `${appOrigin(request, authorized.tenant.slug)}${ruta === '/' ? '' : ruta}`;
  } catch (error) {
    // appOrigin lanza si falta APP_URL / NEXT_PUBLIC_APP_DOMAIN en producción
    const message =
      error instanceof AuthError ? error.message : 'No se pudo determinar la dirección pública';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // El panel pide json solo para mostrar la dirección debajo del código; la
  // imagen la trae el propio <img>, pidiendo esta misma ruta sin ese parámetro.
  if (searchParams.get('formato') === 'json') {
    return NextResponse.json(
      { destino },
      { headers: { 'Cache-Control': 'private, max-age=3600' } }
    );
  }

  const png = await generarQrPng(destino);

  // `inline` para mostrarlo en un <img> (habilita "mantener presionado para
  // guardar" en el teléfono); `attachment` solo cuando lo pide el botón de
  // descargar explícito. Antes era siempre `inline` incluso para el enlace de
  // descarga, que es justo lo contrario de lo que ese botón necesitaba.
  const descarga = searchParams.get('descargar') === '1';
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // Privado: depende de la sesión, no debe quedar en caché compartida
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `${descarga ? 'attachment' : 'inline'}; filename="qr-${pagina}.png"`,
    },
  });
}
