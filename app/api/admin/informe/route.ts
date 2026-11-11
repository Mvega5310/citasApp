import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { store } from '@/lib/server/data';
import { catalogFor } from '@/lib/server/catalog';
import { logger } from '@/lib/server/logger';

/**
 * Informe de cierre: qué se facturó en un periodo, y de quién.
 *
 * Solo cuentan las citas **completadas**. Una cita confirmada todavía no es
 * dinero: el cliente puede no aparecer. Las canceladas y pendientes se
 * informan aparte, porque saber cuántas se caen es parte del cierre.
 *
 * El precio sale de la propia cita (congelado al reservar). Las anteriores a
 * la migración 005 no lo tienen; esas se cuentan en `sinPrecio` y NO se
 * estiman con el catálogo de hoy: daría una cifra inventada que además
 * cambiaría cada vez que la barbería ajuste precios.
 */
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde') ?? '';
  const hasta = searchParams.get('hasta') ?? '';
  if (!FORMATO_FECHA.test(desde) || !FORMATO_FECHA.test(hasta)) {
    return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
  }
  if (desde > hasta) {
    return NextResponse.json({ error: 'La fecha inicial es posterior a la final.' }, { status: 400 });
  }

  try {
    const [citas, barberos] = await Promise.all([
      store().listAppointments(auth.tenant.slug),
      store().listBarbers(auth.tenant.slug).catch(() => []),
    ]);

    const delPeriodo = citas.filter((c) => c.date >= desde && c.date <= hasta);
    const completadas = delPeriodo.filter((c) => c.status === 'completed');

    const nombreBarbero = new Map(barberos.map((b) => [b.id, b.name]));
    const porBarbero = new Map<string, { nombre: string; citas: number; total: number; sinPrecio: number }>();
    const porServicio = new Map<string, { nombre: string; citas: number; total: number; sinPrecio: number }>();

    let total = 0;
    let sinPrecio = 0;

    for (const c of completadas) {
      const precio = typeof c.price === 'number' ? c.price : null;
      if (precio === null) sinPrecio++;
      else total += precio;

      const bid = c.barberId ?? '__sin__';
      const b = porBarbero.get(bid) ?? {
        nombre: c.barberId ? nombreBarbero.get(c.barberId) ?? c.barberId : 'Sin asignar',
        citas: 0,
        total: 0,
        sinPrecio: 0,
      };
      b.citas++;
      if (precio === null) b.sinPrecio++;
      else b.total += precio;
      porBarbero.set(bid, b);

      const s = porServicio.get(c.serviceId) ?? { nombre: c.serviceName, citas: 0, total: 0, sinPrecio: 0 };
      s.citas++;
      if (precio === null) s.sinPrecio++;
      else s.total += precio;
      porServicio.set(c.serviceId, s);
    }

    const canceladas = delPeriodo.filter((c) => c.status === 'cancelled');
    const ordenar = <T extends { total: number }>(m: Map<string, T>) =>
      [...m.values()].sort((a, b) => b.total - a.total);

    return NextResponse.json({
      desde,
      hasta,
      resumen: {
        total,
        completadas: completadas.length,
        canceladas: canceladas.length,
        // Cancelar con poco margen es la que duele: el hueco ya no se llena.
        cancelacionesTarde: canceladas.filter((c) => c.lateCancel === true).length,
        pendientes: delPeriodo.filter((c) => c.status === 'pending' || c.status === 'confirmed').length,
        sinPrecio,
        ticketPromedio: completadas.length - sinPrecio > 0 ? Math.round(total / (completadas.length - sinPrecio)) : 0,
      },
      porBarbero: ordenar(porBarbero),
      porServicio: ordenar(porServicio),
    });
  } catch (error) {
    logger.warn('informe_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo generar el informe' }, { status: 503 });
  }
}
