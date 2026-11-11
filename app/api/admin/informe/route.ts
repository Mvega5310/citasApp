import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorization';
import { store } from '@/lib/server/data';
import { catalogFor } from '@/lib/server/catalog';
import { logger } from '@/lib/server/logger';
import { barberoDeLaCuenta, soloDeEseBarbero } from '@/lib/server/alcance';

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

    const miBarbero = await barberoDeLaCuenta(auth.session);
    const visibles = soloDeEseBarbero(citas, miBarbero);
    const delPeriodo = visibles.filter((c) => c.date >= desde && c.date <= hasta);
    const completadas = delPeriodo.filter((c) => c.status === 'completed');

    const datosBarbero = new Map(barberos.map((b) => [b.id, b]));
    type LineaBarbero = {
      nombre: string;
      citas: number;
      total: number;
      sinPrecio: number;
      porcentaje: number;
      leToca: number;
      modalidad: 'comision' | 'puesto';
      tarifaDiaria: number;
      /** Fechas distintas con citas completadas: es lo que se cobra del puesto. */
      diasTrabajados: number;
      /** Lo que le debe al local por los días de puesto. */
      debeAlLocal: number;
      /** Lo que le queda en el bolsillo, ya con su modalidad aplicada. */
      neto: number;
      dias: Set<string>;
    };
    const porBarbero = new Map<string, LineaBarbero>();
    const porServicio = new Map<string, { nombre: string; citas: number; total: number; sinPrecio: number }>();

    let total = 0;
    let sinPrecio = 0;

    for (const c of completadas) {
      const precio = typeof c.price === 'number' ? c.price : null;
      if (precio === null) sinPrecio++;
      else total += precio;

      const bid = c.barberId ?? '__sin__';
      const datos = c.barberId ? datosBarbero.get(c.barberId) : undefined;
      const b = porBarbero.get(bid) ?? {
        nombre: c.barberId ? datos?.name ?? c.barberId : 'Sin asignar',
        citas: 0,
        total: 0,
        sinPrecio: 0,
        porcentaje: datos?.commission ?? 0,
        leToca: 0,
        modalidad: datos?.modalidad ?? ('comision' as const),
        tarifaDiaria: datos?.tarifaDiaria ?? 0,
        diasTrabajados: 0,
        debeAlLocal: 0,
        neto: 0,
        dias: new Set<string>(),
      };
      b.citas++;
      if (precio === null) b.sinPrecio++;
      else b.total += precio;
      b.dias.add(c.date);
      porBarbero.set(bid, b);

      const s = porServicio.get(c.serviceId) ?? { nombre: c.serviceName, citas: 0, total: 0, sinPrecio: 0 };
      s.citas++;
      if (precio === null) s.sinPrecio++;
      else s.total += precio;
      porServicio.set(c.serviceId, s);
    }

    // Cerrar las cuentas de cada barbero según su modalidad. Se hace al final y
    // sobre el total del periodo, no cita a cita: redondear cada cita y sumar
    // se desvía de lo que de verdad le corresponde.
    //
    // Son dos modelos opuestos, y de ahí sale la caja del local:
    //   comision → lo que produjo es del local, que le paga su %
    //   puesto   → lo que produjo es suyo, y le paga al local la tarifa por día
    let paraElLocal = 0;
    for (const b of porBarbero.values()) {
      b.diasTrabajados = b.dias.size;
      if (b.modalidad === 'puesto') {
        b.leToca = 0;
        b.debeAlLocal = b.diasTrabajados * b.tarifaDiaria;
        b.neto = b.total - b.debeAlLocal;
        paraElLocal += b.debeAlLocal;
      } else {
        b.leToca = Math.round((b.total * b.porcentaje) / 100);
        b.debeAlLocal = 0;
        b.neto = b.leToca;
        paraElLocal += b.total - b.leToca;
      }
    }

    const canceladas = delPeriodo.filter((c) => c.status === 'cancelled');
    const ordenar = <T extends { total: number }>(m: Map<string, T>) =>
      [...m.values()].sort((a, b) => b.total - a.total);
    // `dias` es un Set auxiliar; fuera del cálculo no aporta nada al panel.
    const sinSet = ({ dias, ...resto }: LineaBarbero) => resto;

    return NextResponse.json({
      desde,
      hasta,
      resumen: {
        total,
        // Caja del local una vez repartido: con 'puesto' sumar lo que produjo
        // el barbero sería contar dinero que no le pertenece al local.
        paraElLocal,
        completadas: completadas.length,
        canceladas: canceladas.length,
        // Cancelar con poco margen es la que duele: el hueco ya no se llena.
        cancelacionesTarde: canceladas.filter((c) => c.lateCancel === true).length,
        pendientes: delPeriodo.filter((c) => c.status === 'pending' || c.status === 'confirmed').length,
        sinPrecio,
        ticketPromedio: completadas.length - sinPrecio > 0 ? Math.round(total / (completadas.length - sinPrecio)) : 0,
      },
      porBarbero: ordenar(porBarbero).map(sinSet),
      // Lo que hay que repartir en total, para cuadrar el corte de una mirada
      totalComisiones: [...porBarbero.values()].reduce((s, b) => s + b.leToca, 0),
      // Lo que cobra el local por los puestos, y lo que le queda en total
      totalPuestos: [...porBarbero.values()].reduce((s, b) => s + b.debeAlLocal, 0),
      /** Solo ve lo suyo: el panel oculta la caja del local y los demás. */
      soloMias: miBarbero !== null,
      porServicio: ordenar(porServicio),
    });
  } catch (error) {
    logger.warn('informe_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo generar el informe' }, { status: 503 });
  }
}
