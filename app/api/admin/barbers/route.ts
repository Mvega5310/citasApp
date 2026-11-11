import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { store, type BarberRecord } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';

/** Mismo formato que el CHECK del esquema. */
const ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const MAX_BARBEROS = 20;

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ barbers: await store().listBarbers(auth.tenant.slug) });
  } catch (error) {
    logger.warn('barbers_list_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo cargar el equipo' }, { status: 503 });
  }
}

/** Reemplaza el equipo completo, como el editor de servicios. */
export async function PUT(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  let entrada: unknown;
  try {
    entrada = (await request.json())?.barbers;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!Array.isArray(entrada)) {
    return NextResponse.json({ error: 'Se esperaba una lista de barberos' }, { status: 400 });
  }
  if (entrada.length > MAX_BARBEROS) {
    return NextResponse.json({ error: `Máximo ${MAX_BARBEROS} barberos.` }, { status: 400 });
  }

  const barbers: BarberRecord[] = [];
  const vistos = new Set<string>();
  for (const raw of entrada) {
    const b = raw as Record<string, unknown>;
    const id = String(b.id ?? '').trim().toLowerCase();
    const name = String(b.name ?? '').trim();
    if (!ID_RE.test(id)) {
      return NextResponse.json(
        { error: `"${id}" no sirve como código: usa minúsculas, números y guiones.` },
        { status: 400 }
      );
    }
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'Cada barbero necesita un nombre de 2 a 60 caracteres.' }, { status: 400 });
    }
    if (vistos.has(id)) {
      return NextResponse.json({ error: `El código "${id}" está repetido.` }, { status: 400 });
    }
    const commission = Number(b.commission ?? 0);
    if (!Number.isInteger(commission) || commission < 0 || commission > 100) {
      return NextResponse.json(
        { error: `El porcentaje de "${name}" debe ser un número entero entre 0 y 100.` },
        { status: 400 }
      );
    }
    const modalidad = b.modalidad === 'puesto' ? ('puesto' as const) : ('comision' as const);
    const tarifaDiaria = Number(b.tarifaDiaria ?? 0);
    if (!Number.isInteger(tarifaDiaria) || tarifaDiaria < 0 || tarifaDiaria > 10000000) {
      return NextResponse.json(
        { error: `La tarifa diaria de "${name}" no es válida.` },
        { status: 400 }
      );
    }
    vistos.add(id);
    // Los dos valores se guardan siempre, pero solo cuenta el de su modalidad:
    // así cambiar de modelo y volver no pierde lo que había configurado.
    barbers.push({ id, name, active: b.active !== false, commission, modalidad, tarifaDiaria });
  }

  try {
    await store().saveBarbers(auth.tenant.slug, barbers);
    return NextResponse.json({ ok: true, barbers });
  } catch (error) {
    // saveBarbers lanza un mensaje legible cuando se intenta quitar a alguien
    // que tiene citas: se devuelve tal cual para que el admin sepa qué pasó.
    const msg = error instanceof Error ? error.message : 'No se pudo guardar el equipo';
    logger.warn('barbers_save_failed', { error: msg });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
