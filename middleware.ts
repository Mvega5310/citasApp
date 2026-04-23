import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

  if (
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout' ||
    pathname === '/api/admin/seed'
  ) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
