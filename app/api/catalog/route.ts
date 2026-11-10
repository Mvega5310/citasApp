import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { catalogFor } from '@/lib/server/catalog';
import { readSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

/**
 * Catálogo público (servicios activos + horario general) de la barbería del
 * host, más su nombre.
 *
 * El nombre viaja aquí porque el encabezado, el pie y la portada lo tomaban de
 * NEXT_PUBLIC_APP_NAME, que se incrusta al compilar y es la misma para todo el
 * despliegue: con dos barberías, la segunda mostraría el nombre de la primera.
 */
export async function GET(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;

  const settings = await readSettings(tenantResult.tenant);

  return NextResponse.json(
    { ...catalogFor(tenantResult.tenant), salonName: settings.salonName },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
