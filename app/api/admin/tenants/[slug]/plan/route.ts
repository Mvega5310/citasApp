import { NextResponse } from 'next/server';
import { authorizePlatformAdmin } from '@/lib/server/platform';
import { store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';
import { sumarMeses, hoyISO } from '@/lib/server/suscripcion';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PRECIO_MAX = 10_000_000;
const NOTA_MAX = 200;

/**
 * Cambia el plan acordado con una barbería.
 *
 * No cobra nada: aquí no hay pasarela. Registra hasta cuándo está cubierta,
 * qué se acordó y cómo paga, que es lo que hace falta para no perder la
 * cuenta durante una prueba de tres meses.
 *
 * Y **no toca `tenants.status`**: vencerse no suspende. Suspender sigue
 * siendo una decisión manual y aparte, porque una barbería con citas
 * reservadas no puede quedarse sin panel por una mensualidad.
 */
export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const authorized = await authorizePlatformAdmin(request);
  if (!authorized.ok) return authorized.response;

  const slug = params.slug.trim().toLowerCase();

  let body: { hasta?: unknown; precio?: unknown; nota?: unknown; renovarMeses?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const precio = Number(body.precio ?? 0);
  if (!Number.isInteger(precio) || precio < 0 || precio > PRECIO_MAX) {
    return NextResponse.json({ error: 'El precio del plan no es válido.' }, { status: 400 });
  }

  const nota = String(body.nota ?? '').trim().slice(0, NOTA_MAX);

  let hasta: string | null = null;
  if (typeof body.renovarMeses === 'number') {
    // Renovar desde la fecha actual de vencimiento si sigue vigente, y desde
    // hoy si ya venció: así renovar tarde no regala los días de atraso, pero
    // renovar a tiempo tampoco los quita.
    const meses = Math.min(24, Math.max(1, Math.floor(body.renovarMeses)));
    const actual = (await store().listTenants()).find((t) => t.slug === slug);
    if (!actual) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 });
    const hoy = hoyISO();
    const base = actual.plan.hasta && actual.plan.hasta > hoy ? actual.plan.hasta : hoy;
    hasta = sumarMeses(base, meses);
  } else if (body.hasta === null || body.hasta === '') {
    // Sin plazo: cortesía indefinida.
    hasta = null;
  } else {
    const valor = String(body.hasta ?? '');
    if (!FORMATO_FECHA.test(valor) || Number.isNaN(Date.parse(`${valor}T12:00:00Z`))) {
      return NextResponse.json({ error: 'La fecha de vencimiento no es válida.' }, { status: 400 });
    }
    hasta = valor;
  }

  try {
    const ok = await store().updateTenantPlan(slug, { hasta, precio, nota });
    if (!ok) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 });
    logger.info('tenant_plan_changed', { slug, hasta, precio, by: authorized.session.uid });
    return NextResponse.json({ ok: true, plan: { hasta, precio, nota } });
  } catch (error) {
    logger.error('tenant_plan_failed', {
      slug,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo guardar el plan' }, { status: 503 });
  }
}
