import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/server/db';

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  const header = request.headers.get('x-admin-secret');
  return !!secret && header === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    await ensureSchema();
    return NextResponse.json({ ok: true, message: 'Schema creado/verificado' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error creando schema';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
