import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authorizeAdmin } from '@/lib/server/authorization';
import { appOrigin, AuthError } from '@/lib/server/auth';

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

  // Oscuro sobre blanco siempre: hay lectores que no reconocen un QR invertido.
  // El margen (quiet zone) es parte del estándar, sin él muchos no enfocan.
  const svg = await QRCode.toString(destino, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#100E0C', light: '#FFFFFF' },
  });

  // El panel pide json para mostrar también la dirección debajo del código;
  // por defecto sale la imagen, para que sirva en <img> y al descargar.
  if (searchParams.get('formato') === 'json') {
    return NextResponse.json(
      { destino, svg },
      { headers: { 'Cache-Control': 'private, max-age=3600' } }
    );
  }

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Privado: depende de la sesión, no debe quedar en caché compartida
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="qr-${pagina}.svg"`,
    },
  });
}
