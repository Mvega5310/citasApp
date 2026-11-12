import { headers } from 'next/headers';
import { resolveTenant } from './tenant';
import { readSettings } from './settings';

/**
 * Identidad de la barbería que atiende esta petición, para los metadatos.
 *
 * El layout raíz tenía el nombre escrito a mano, así que **todas** las
 * barberías de la plataforma salían como "Marcos BarberShop": en la pestaña
 * del navegador, en la vista previa al compartir el enlace por WhatsApp y al
 * instalar la app en el teléfono. Cada una debe aparecer con lo suyo.
 */
export type Marca = {
  nombre: string;
  descripcion: string;
  ciudad: string;
  /** Origen real de esta petición, para las URLs absolutas de Open Graph. */
  origen: string;
};

/**
 * Cuando no se puede resolver la barbería (host desconocido, base caída), se
 * usa el nombre de la plataforma. Es preferible a mostrar el de otra barbería.
 */
const PLATAFORMA = 'BeautyTurno';

function origenDeLaPeticion(): string {
  const h = headers();
  const host = h.get('host') ?? 'beautyturno.com';
  // x-forwarded-proto lo pone el proxy de Railway; en local no existe.
  const protocolo = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocolo}://${host}`;
}

export async function marcaDeLaPagina(): Promise<Marca> {
  const origen = origenDeLaPeticion();
  try {
    const result = await resolveTenant(headers().get('x-tenant-slug'));
    // Sin `notFound()`: los metadatos no deben tumbar la página. Si la
    // barbería no existe, la propia página ya responde 404 por su cuenta.
    if (!result.ok) return { nombre: PLATAFORMA, descripcion: '', ciudad: '', origen };

    const settings = await readSettings(result.tenant);
    const nombre = settings.salonName.trim() || PLATAFORMA;
    const ciudad = settings.city.trim();
    return {
      nombre,
      descripcion: ciudad
        ? `Reserva tu cita en ${nombre}, ${ciudad}. Corte, barba y más, en línea y en segundos.`
        : `Reserva tu cita en ${nombre}. Corte, barba y más, en línea y en segundos.`,
      ciudad,
      origen,
    };
  } catch {
    return { nombre: PLATAFORMA, descripcion: '', ciudad: '', origen };
  }
}
