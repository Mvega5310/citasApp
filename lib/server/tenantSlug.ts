/**
 * Validación de la dirección (slug) de una barbería nueva.
 *
 * Antes vivía solo dentro de `/api/admin/tenants` porque era el único lugar
 * que creaba barberías. Con el registro directo (`/api/registro`) hay un
 * segundo lugar que necesita las mismas reglas — y deben ser EXACTAMENTE las
 * mismas, para que una dirección que el registro público aceptó no choque
 * después contra el resolutor de tenants o contra una ruta reservada.
 */

/** Mismo formato que acepta el resolutor y que valida el CHECK del esquema. */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Nombres que no pueden ser una barbería porque chocarían con la
 * infraestructura: unos son subdominios que ya significan otra cosa, otros se
 * confundirían con rutas de la plataforma, y `www` ya lo trata el resolutor
 * como la barbería por defecto.
 */
export const RESERVADOS = new Set([
  'www', 'admin', 'api', 'app', 'mail', 'email', 'smtp', 'ftp', 'cdn', 'static',
  'assets', 'blog', 'docs', 'help', 'soporte', 'support', 'status', 'panel',
  'dashboard', 'login', 'cuenta', 'account', 'billing', 'pago', 'pagos',
  'test', 'staging', 'dev', 'demo-test', 'rsend', 'send', '_acme-challenge',
  'registro', 'registrar', 'signup',
]);

/** null = la dirección es válida. En otro caso, el mensaje para mostrar. */
export function validarSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) {
    return 'La dirección solo admite minúsculas, números y guiones, y no puede empezar ni terminar en guión.';
  }
  if (RESERVADOS.has(slug)) {
    return `"${slug}" está reservado, elige otra dirección.`;
  }
  return null;
}
