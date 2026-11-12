import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { barberoDeLaCuenta } from '@/lib/server/alcance';
import type { AppointmentRecord } from '@/lib/server/data/types';

export const dynamic = 'force-dynamic';

const ESTADOS = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tope de filas por página. Pedir más no sirve en pantalla y abriría la puerta
 * a traerse el histórico entero de un tirón, que es justo lo que se corrigió.
 */
const MAX_LIMITE = 100;
const LIMITE_POR_DEFECTO = 20;

function entero(valor: string | null, porDefecto: number, min: number, max: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Una página de las citas de la barbería, más recientes primero.
 *
 * Los filtros de estado y fecha se aplican **en la base**. Antes venían todas
 * las citas y el navegador filtraba y paginaba: con 528 filas ya se notaba al
 * abrir el panel, y solo crece con cada cita que se reserva.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (!isStoreConfigured()) {
    return NextResponse.json({ error: 'No se pudo obtener las citas' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('status');
  const fecha = searchParams.get('date');
  const limit = entero(searchParams.get('limit'), LIMITE_POR_DEFECTO, 1, MAX_LIMITE);
  const offset = entero(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);

  try {
    // Una cuenta vinculada a un barbero solo ve sus citas. Va como filtro de
    // la consulta y no como recorte posterior: así las de los compañeros ni
    // siquiera salen de la base.
    const miBarbero = await barberoDeLaCuenta(auth.session);

    const { rows, total, resumen } = await store().listAppointmentsPage(auth.tenant.slug, {
      status: ESTADOS.includes(estado as (typeof ESTADOS)[number])
        ? (estado as AppointmentRecord['status'])
        : undefined,
      date: fecha && FORMATO_FECHA.test(fecha) ? fecha : undefined,
      barberId: miBarbero ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      rows,
      total,
      resumen,
      limit,
      offset,
      soloMias: miBarbero !== null,
      count: rows.length,
    });
  } catch (error) {
    logger.warn('admin_appointments_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo obtener las citas' }, { status: 503 });
  }
}
