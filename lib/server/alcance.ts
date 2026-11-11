import { store } from './data';
import type { SessionUser } from './session';

/**
 * A qué citas puede llegar esta cuenta.
 *
 * Si la cuenta está vinculada a un barbero, solo ve las suyas. Es el caso del
 * local informal: tres colegas que comparten arriendo, donde la agenda del
 * otro no es asunto de nadie. Quien administra no está vinculado y ve todo.
 *
 * Se resuelve **en el servidor y contra la base**, no con el token ni
 * filtrando en el navegador: si se filtrara en el cliente, las citas de los
 * compañeros habrían viajado igual y bastaría abrir la consola para leerlas.
 */
export async function barberoDeLaCuenta(session: SessionUser): Promise<string | null> {
  try {
    const admin = await store().getAdmin(session.uid);
    return admin?.barberId ?? null;
  } catch {
    // Ante un fallo se restringe, no se abre: es preferible que el panel
    // aparezca vacío a que muestre las citas de otro.
    return '__sin_acceso__';
  }
}

/**
 * ¿Puede esta cuenta tocar esta cita? Para el listado basta filtrar, pero una
 * cita concreta se pide por id: sin esta comprobación, una cuenta vinculada
 * podría completar o borrar la cita de un compañero conociendo su id.
 */
export async function puedeTocarLaCita(
  session: SessionUser,
  tenantSlug: string,
  citaId: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const miBarbero = await barberoDeLaCuenta(session);
  if (miBarbero === null) return { ok: true };

  const cita = await store().getAppointment(tenantSlug, citaId);
  if (!cita || cita.barberId !== miBarbero) {
    // Mismo 404 que una cita inexistente: decir "no es tuya" confirmaría que
    // existe y de quién es, que es justo lo que no debe ver.
    return {
      ok: false,
      response: Response.json({ error: 'Cita no encontrada' }, { status: 404 }),
    };
  }
  return { ok: true };
}

/** Filtra una lista de citas a las de ese barbero. `null` = sin restricción. */
export function soloDeEseBarbero<T extends { barberId?: string | null }>(
  citas: T[],
  barberId: string | null
): T[] {
  if (barberId === null) return citas;
  return citas.filter((c) => c.barberId === barberId);
}
