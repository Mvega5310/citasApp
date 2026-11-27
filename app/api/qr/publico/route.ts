import { NextResponse } from 'next/server';
import { marcaDeLaPagina } from '@/lib/server/marca';
import { generarQrPng, nombreDeArchivo } from '@/lib/server/qrImage';

/**
 * Código QR de inicio de ESTA barbería, sin sesión.
 *
 * Es lo que usa el botón "Compartir" del sitio público: cualquier visitante
 * puede generarlo para la barbería que está viendo, nunca para otra. Solo
 * apunta a la página de inicio -ni siquiera acepta elegir otra página, a
 * diferencia de `/api/qr` (el del panel)- por la misma razón que esa ruta ya
 * documenta: aceptar un destino por fuera convertiría esto en un generador de
 * QR alojado en el dominio propio, ideal para una estafa con su confianza.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { nombre, origen } = await marcaDeLaPagina();
  const destino = origen;

  const { searchParams } = new URL(request.url);

  if (searchParams.get('formato') === 'json') {
    return NextResponse.json(
      { destino, nombre },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  }

  const png = await generarQrPng(destino);
  const descarga = searchParams.get('descargar') === '1';

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // Público y siempre igual para esta barbería: sí puede quedar en caché
      // compartida, al revés que el del panel.
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': `${descarga ? 'attachment' : 'inline'}; filename="qr-${nombreDeArchivo(nombre)}.png"`,
    },
  });
}
