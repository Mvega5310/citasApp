import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { catalogFor } from '@/lib/server/catalog';
import { readSettings } from '@/lib/server/settings';
import { store } from '@/lib/server/data';

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

  const [settings, barbers] = await Promise.all([
    readSettings(tenantResult.tenant),
    store().listBarbers(tenantResult.tenant.slug).catch(() => []),
  ]);

  return NextResponse.json(
    {
      ...catalogFor(tenantResult.tenant),
      salonName: settings.salonName,
      // Solo los activos: el cliente no debe ver a quien ya no atiende
      barbers: barbers.filter((b) => b.active).map(({ id, name }) => ({ id, name })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
