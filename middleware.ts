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
  return process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'demo';
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  try {
    const s = process.env.ADMIN_SECRET;
    if (!s) return false;
    await jwtVerify(token, new TextEncoder().encode(s));
    return true;
  } catch {
    return false;
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
    pathname === '/api/admin/seed'
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!(await isAuthenticated(request))) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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
