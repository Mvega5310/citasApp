import QRCode from 'qrcode';

/**
 * El código QR, en PNG.
 *
 * Era SVG, inyectado en pantalla como markup crudo y servido para descargar
 * con `Content-Disposition: inline` -justo lo contrario de lo que pide un
 * botón de descarga-. En iOS eso significa que no hay nada que "mantener
 * presionado para guardar": no es una foto, es texto XML. Con PNG, el mismo
 * archivo sirve como `<img>` en pantalla (long-press nativo para guardar y
 * ampliar) y como descarga de verdad.
 */
export async function generarQrPng(destino: string): Promise<Buffer> {
  // Oscuro sobre blanco siempre: hay lectores que no reconocen un QR invertido.
  // El margen (quiet zone) es parte del estándar, sin él muchos no enfocan.
  // 512px: nítido en pantalla y suficiente para imprimir, a unos pocos KB.
  return QRCode.toBuffer(destino, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#100E0C', light: '#FFFFFF' },
  });
}

/**
 * Un nombre, limpio para ir en un nombre de archivo y en una cabecera HTTP:
 * ahí no valen acentos, espacios ni comillas sin escapar.
 */
export function nombreDeArchivo(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return limpio || 'barberia';
}
