import { NextResponse } from 'next/server';
import { isStoreConfigured, store } from '@/lib/server/data';
import { authorizeAdmin } from '@/lib/server/authorization';

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  if (isStoreConfigured()) {
    try {
      const data = await store().getAdmin(session.uid);
      if (data) {
        return NextResponse.json({
          uid: session.uid,
          name: data.name || session.name,
          email: data.email || session.email,
          role: data.role || session.role,
        });
      }
    } catch {}
  }

  return NextResponse.json({
    uid: session.uid,
    name: session.name,
    email: session.email,
    role: session.role,
  });
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }

    const trimmed = name.trim();

    if (isStoreConfigured()) {
      await store().updateAdmin(session.uid, { name: trimmed });
    }

    return NextResponse.json({ ok: true, name: trimmed });
  } catch {
    return NextResponse.json({ error: 'Error al guardar el perfil' }, { status: 500 });
  }
}
