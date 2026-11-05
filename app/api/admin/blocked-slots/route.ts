import { NextRequest, NextResponse } from 'next/server';
import { isStoreConfigured, store } from '@/lib/server/data';
import { authorizeAdmin } from '@/lib/server/authorization';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const tenantSlug = auth.tenant.slug;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  if (!isStoreConfigured()) {
    return NextResponse.json({ blocked: [] });
  }

  try {
    return NextResponse.json({ blocked: await store().blockedSlots(tenantSlug, date) });
  } catch {
    return NextResponse.json({ blocked: [] });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const tenantSlug = auth.tenant.slug;

  try {
    const { date, slots, action } = (await request.json()) as {
      date: string;
      slots: string[];
      action: 'block' | 'unblock';
    };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: 'slots debe ser un arreglo no vacío' }, { status: 400 });
    }

    if (action !== 'block' && action !== 'unblock') {
      return NextResponse.json({ error: 'action debe ser block o unblock' }, { status: 400 });
    }

    if (!isStoreConfigured()) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    if (!slots.every((t) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t))) {
      return NextResponse.json({ error: 'Horas inválidas' }, { status: 400 });
    }

    const updated = await store().updateBlockedSlots(tenantSlug, date, slots, action);
    return NextResponse.json({ ok: true, blocked: updated });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar los horarios' }, { status: 500 });
  }
}
