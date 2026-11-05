import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Extrae el slug del tenant desde el subdominio.
// salon-marta.beautyturno.com → "salon-marta"
// localhost:3000             → NEXT_PUBLIC_DEFAULT_TENANT o "demo"
function extractTenantSlug(request: NextRequest): string {
  const host = request.headers.get('host') ?? '';
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'beautyturno.com';

  if (host.endsWith(`.${appDomain}`)) {
    return host.replace(`.${appDomain}`, '');
  }
  // Desarrollo local o dominio raíz → tenant por defecto
  return DEFAULT_TENANT;
}

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'demo';

// Misma normalización que resolveRequestTenant (lib/server/tenant.ts)
function normalizeTenant(slug: string): string {
  const s = slug.trim().toLowerCase();
  return !s || s === 'www' ? DEFAULT_TENANT : s;
}

type AuthState = 'none' | 'other-tenant' | 'ok';

// Valida la sesión y que pertenezca a la barbería del host.
// Es una capa adicional: cada ruta /api/admin vuelve a validarlo en el servidor.
async function getAuthState(request: NextRequest, tenantSlug: string): Promise<AuthState> {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return 'none';
  try {
    const s = process.env.ADMIN_SECRET;
    if (!s) return 'none';
    const { payload } = await jwtVerify(token, new TextEncoder().encode(s));
    const sessionTenant = typeof payload.tenantSlug === 'string' && payload.tenantSlug ? payload.tenantSlug : DEFAULT_TENANT;
    return sessionTenant === normalizeTenant(tenantSlug) ? 'ok' : 'other-tenant';
  } catch {
    return 'none';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const tenantSlug = extractTenantSlug(request);

  // Propagar el slug como header para que los Server Components lo lean
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  if (
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout' ||
    pathname === '/api/admin/seed' ||
    pathname === '/api/admin/password/forgot' ||
    pathname === '/api/admin/password/reset'
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Páginas públicas del panel: iniciar sesión y crear/restablecer contraseña
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/password') {
    if ((await getAuthState(request, tenantSlug)) !== 'ok') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith('/api/admin/')) {
    const state = await getAuthState(request, tenantSlug);
    if (state === 'none') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (state === 'other-tenant') {
      return NextResponse.json({ error: 'No tienes acceso a esta barbería' }, { status: 403 });
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Excluye archivos estáticos, imágenes y assets de Next.js
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
