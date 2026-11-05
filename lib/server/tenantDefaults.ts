// Constantes de barbería sin dependencias (las usan el resolutor, la
// autorización y la capa de datos, sin crear importaciones circulares).

/** Barbería por defecto (modo de una sola barbería / desarrollo local). */
export const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'demo';

/** Barbería a la que pertenece un admin (documento o sesión). Sin campo = barbería por defecto. */
export function adminTenantOf(record: { tenantSlug?: unknown } | null | undefined): string {
  const slug = typeof record?.tenantSlug === 'string' ? record.tenantSlug.trim() : '';
  return slug || DEFAULT_TENANT_SLUG;
}
