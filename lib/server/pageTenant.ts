import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Catalog, PublicCatalog } from '../shared/services';
import { resolveTenant } from './tenant';
import { catalogFor } from './catalog';
import { readSettings } from './settings';

/**
 * Catálogo de la barbería para páginas del servidor (Server Components).
 * Si la barbería no existe o no está disponible, muestra la página 404.
 */
export async function getPageCatalog(): Promise<Catalog> {
  const result = await resolveTenant(headers().get('x-tenant-slug'));
  if (!result.ok) notFound();
  return catalogFor(result.tenant);
}

/**
 * Igual que getPageCatalog, pero incluye el nombre del negocio.
 *
 * Para las páginas que lo muestran en pantalla. Cuesta una consulta más
 * (la configuración de la barbería), así que las páginas que solo listan
 * servicios siguen usando getPageCatalog.
 */
export async function getPageCatalogWithName(): Promise<PublicCatalog> {
  const result = await resolveTenant(headers().get('x-tenant-slug'));
  if (!result.ok) notFound();
  const settings = await readSettings(result.tenant);
  return { ...catalogFor(result.tenant), salonName: settings.salonName };
}
