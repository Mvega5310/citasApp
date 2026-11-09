import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from './session';
import { store } from './data';
import { resolveRequestTenant, type RequestTenant } from './tenant';
import { adminTenantOf } from './tenantDefaults';

export { adminTenantOf };


type AuthorizeResult =
  | { ok: true; session: SessionUser; tenant: RequestTenant }
  | { ok: false; response: NextResponse };

/**
 * ¿La sesión es anterior al último cambio de contraseña del admin?
 *
 * `iat` del token viene en segundos (truncado), así que la marca de la base se
 * trunca igual antes de comparar: si no, cambiar la contraseña y entrar dentro
 * del mismo segundo invalidaría la sesión recién creada.
 *
 * Un error de lectura no cierra la sesión: el resto de authorizeAdmin ya
 * comprobó sesión, barbería y rol, y dejar fuera a un admin por una consulta
 * fallida es peor que mantener viva una sesión unos minutos más.
 */
async function sessionWasRevoked(session: SessionUser): Promise<boolean> {
  if (!session.iat) return false;
  try {
    const admin = await store().getAdmin(session.uid);
    if (!admin?.passwordChangedAt) return false;
    const changedAtSec = Math.floor(new Date(admin.passwordChangedAt).getTime() / 1000);
    return Number.isFinite(changedAtSec) && session.iat < changedAtSec;
  } catch {
    return false;
  }
}

/**
 * Autorización de las rutas /api/admin/*.
 * 1. Resuelve y valida la barbería de la petición (host).
 * 2. Exige una sesión válida.
 * 3. Exige que la sesión pertenezca a esa misma barbería.
 * 4. Opcionalmente exige el rol "admin".
 * 5. Rechaza las sesiones anteriores al último cambio de contraseña.
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

  if (await sessionWasRevoked(session)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tu contraseña cambió. Vuelve a iniciar sesión.' },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session, tenant: tenantResult.tenant };
}
