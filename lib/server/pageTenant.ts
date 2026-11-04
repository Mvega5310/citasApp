import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Catalog } from '../shared/services';
import { resolveTenant } from './tenant';
import { catalogFor } from './catalog';

/**
 * Catálogo de la barbería para páginas del servidor (Server Components).
 * Si la barbería no existe o no está disponible, muestra la página 404.
 */
export async function getPageCatalog(): Promise<Catalog> {
  const result = await resolveTenant(headers().get('x-tenant-slug'));
  if (!result.ok) notFound();
  return catalogFor(result.tenant);
}
