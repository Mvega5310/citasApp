import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from './session';
import { resolveRequestTenant, type RequestTenant } from './tenant';
import { adminTenantOf } from './tenantDefaults';

export { adminTenantOf };


type AuthorizeResult =
  | { ok: true; session: SessionUser; tenant: RequestTenant }
  | { ok: false; response: NextResponse };

/**
 * Autorización de las rutas /api/admin/*.
 * 1. Resuelve y valida la barbería de la petición (host).
 * 2. Exige una sesión válida.
 * 3. Exige que la sesión pertenezca a esa misma barbería.
 * 4. Opcionalmente exige el rol "admin".
 */
export async function authorizeAdmin(
  request: Request,
  options: { role?: 'admin' } = {}
): Promise<AuthorizeResult> {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult;

  const session = await getSessionUser(request);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }

  if (adminTenantOf(session) !== tenantResult.tenant.slug) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No tienes acceso a esta barbería' }, { status: 403 }),
    };
  }

  if (options.role && session.role !== options.role) {
    return { ok: false, response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) };
  }

  return { ok: true, session, tenant: tenantResult.tenant };
}
