/**
 * Validación del PNG del logo.
 *
 * Entra un archivo de fuera, así que no basta con confiar en el
 * `Content-Type`: se comprueban los bytes. No hay `sharp` en el proyecto (es
 * una dependencia nativa) y no vale la pena añadirla solo para esto, así que
 * el navegador redimensiona antes de subir y aquí se verifica que lo hizo.
 *
 * El antecedente pesa: el logo original eran 1,78 MB a 2048×2048, y pasarlo
 * por el generador de imágenes devolvía un cuadro en blanco. Que no vuelva a
 * entrar algo así es justo lo que comprueban estos límites.
 */

/** 300 KB. Un PNG de 512×512 bien exportado no llega ni cerca. */
export const MAX_BYTES = 300 * 1024;
export const MAX_LADO = 512;
export const MIN_LADO = 64;

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type RevisionLogo =
  | { ok: true; ancho: number; alto: number }
  | { ok: false; error: string };

export function revisarLogo(bytes: Buffer): RevisionLogo {
  if (bytes.length === 0) return { ok: false, error: 'El archivo llegó vacío.' };
  if (bytes.length > MAX_BYTES) {
    return { ok: false, error: `La imagen pesa más de ${Math.round(MAX_BYTES / 1024)} KB.` };
  }

  // Firma PNG. Un JPEG renombrado a .png no pasa de aquí.
  if (bytes.length < 24 || !FIRMA_PNG.every((b, i) => bytes[i] === b)) {
    return { ok: false, error: 'El archivo no es un PNG válido.' };
  }

  // IHDR va siempre primero: ancho y alto son los bytes 16..23.
  if (bytes.toString('ascii', 12, 16) !== 'IHDR') {
    return { ok: false, error: 'El archivo no es un PNG válido.' };
  }
  const ancho = bytes.readUInt32BE(16);
  const alto = bytes.readUInt32BE(20);

  if (ancho > MAX_LADO || alto > MAX_LADO) {
    return { ok: false, error: `La imagen no puede superar ${MAX_LADO}×${MAX_LADO} píxeles.` };
  }
  if (ancho < MIN_LADO || alto < MIN_LADO) {
    return { ok: false, error: `La imagen debe tener al menos ${MIN_LADO}×${MIN_LADO} píxeles.` };
  }
  // Cuadrado: el logo se pinta en círculos y cuadrados de lado fijo, y uno
  // alargado sale recortado o deformado en todas partes.
  if (ancho !== alto) {
    return { ok: false, error: 'La imagen debe ser cuadrada.' };
  }

  return { ok: true, ancho, alto };
}

/**
 * Monograma de respaldo mientras la barbería no suba su logo.
 *
 * Antes se servía el PNG comiteado, que es el logo de Marcos BarberShop: para
 * cualquier otra barbería eso no es un respaldo, es el logo de otro negocio.
 * Las iniciales sobre la paleta de la app se ven deliberadas y además invitan
 * a subir el propio.
 */
export function monogramaSvg(nombre: string): string {
  const iniciales =
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BT';
  // El nombre lo escribe la barbería y acaba dentro del SVG: se escapa.
  const texto = iniciales.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#201A15"/>
  <rect x="8" y="8" width="496" height="496" rx="90" fill="none" stroke="#C69B62" stroke-opacity="0.45" stroke-width="10"/>
  <text x="256" y="256" fill="#E0BD88" font-family="Georgia, 'Times New Roman', serif" font-size="210" font-weight="700" text-anchor="middle" dominant-baseline="central">${texto}</text>
</svg>`;
}
