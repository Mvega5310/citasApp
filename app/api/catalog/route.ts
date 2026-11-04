import { NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { catalogFor } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';

// Catálogo público (servicios activos + horario general) de la barbería del host.
export async function GET(request: Request) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;

  return NextResponse.json(catalogFor(tenantResult.tenant), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
