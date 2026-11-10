import { ACTIVE_STATUSES, isStoreConfigured, store } from './data';

/**
 * Decide con qué barbero queda una cita.
 *
 * Tres situaciones, y conviene tenerlas claras porque se comportan distinto:
 *
 * 1. La barbería no usa barberos → `barberId: null` y el horario se comporta
 *    como siempre: una cita por franja.
 * 2. El cliente eligió uno → se comprueba que exista, esté activo y tenga esa
 *    franja libre.
 * 3. "Cualquiera disponible" → se elige entre los libres el que menos citas
 *    tiene ese día, para repartir la carga en vez de cargar siempre al primero.
 *
 * `candidatos` devuelve el resto de libres en orden: si al guardar la base
 * rechaza el elegido porque alguien se adelantó, la ruta puede reintentar con
 * el siguiente sin volver a preguntarle al cliente.
 */
export type ResolucionBarbero =
  | { ok: true; barberId: string | null; candidatos: string[] }
  | { ok: false; error: string; status: number };

export async function resolverBarbero(
  tenantSlug: string,
  date: string,
  time: string,
  pedido: string | null | undefined
): Promise<ResolucionBarbero> {
  if (!isStoreConfigured()) return { ok: true, barberId: null, candidatos: [] };

  let equipo: { id: string; name: string; active: boolean }[];
  try {
    equipo = (await store().listBarbers(tenantSlug)).filter((b) => b.active);
  } catch {
    // Si no se puede leer el equipo, no se inventa un barbero: la cita queda
    // sin asignar y el negocio la reparte después.
    return { ok: true, barberId: null, candidatos: [] };
  }

  if (equipo.length === 0) {
    if (pedido) {
      return { ok: false, error: 'Esta barbería no trabaja con barberos asignados.', status: 400 };
    }
    return { ok: true, barberId: null, candidatos: [] };
  }

  let delDia: { time: string; status: string; barberId?: string | null }[] = [];
  try {
    delDia = (await store().appointmentsOnDate(tenantSlug, date)).filter((a) =>
      ACTIVE_STATUSES.includes(a.status as (typeof ACTIVE_STATUSES)[number])
    );
  } catch {
    delDia = [];
  }

  const ocupadosEnLaFranja = new Set(
    delDia.filter((a) => a.time === time && a.barberId).map((a) => a.barberId as string)
  );

  if (pedido) {
    const elegido = equipo.find((b) => b.id === pedido);
    if (!elegido) {
      return { ok: false, error: 'Ese barbero ya no está disponible. Elige otro.', status: 400 };
    }
    if (ocupadosEnLaFranja.has(elegido.id)) {
      return {
        ok: false,
        error: `${elegido.name} ya tiene una cita a esa hora. Elige otro horario u otro barbero.`,
        status: 409,
      };
    }
    return { ok: true, barberId: elegido.id, candidatos: [elegido.id] };
  }

  const libres = equipo.filter((b) => !ocupadosEnLaFranja.has(b.id));
  if (libres.length === 0) {
    return { ok: false, error: 'No queda ningún barbero libre a esa hora. Elige otro horario.', status: 409 };
  }

  // Menos citas ese día primero; a igualdad, el orden del equipo.
  const carga = new Map<string, number>();
  for (const a of delDia) if (a.barberId) carga.set(a.barberId, (carga.get(a.barberId) ?? 0) + 1);
  const orden = [...libres].sort(
    (a, b) =>
      (carga.get(a.id) ?? 0) - (carga.get(b.id) ?? 0) ||
      equipo.indexOf(a) - equipo.indexOf(b)
  );

  return { ok: true, barberId: orden[0].id, candidatos: orden.map((b) => b.id) };
}
