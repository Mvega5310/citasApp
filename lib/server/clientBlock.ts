import { store } from './data';

/**
 * ¿Esta persona ya no puede reservar sola?
 *
 * Ante un fallo de lectura se deja reservar, al revés que `alcance.ts`: ahí
 * fallar cerrado protege de ver la cita de un compañero; aquí fallar cerrado
 * tumbaría la reserva de TODO el mundo por un error transitorio de la base.
 * Aceptar una reserva de más es mucho más barato que eso.
 */
export async function clienteBloqueado(tenantSlug: string, email: string): Promise<boolean> {
  try {
    return await store().isClientBlocked(tenantSlug, email.trim().toLowerCase());
  } catch {
    return false;
  }
}
