/**
 * Los datos de la última reserva, guardados en el teléfono de la persona.
 *
 * Es el atajo que de verdad le ahorra teclear al cliente que vuelve: el caso
 * normal es que reserve desde su propio celular, así que al llegar al paso de
 * datos ya está todo puesto y no hace falta preguntarle nada al servidor.
 *
 * Importante que viva aquí y no en la base: buscar por nombre en el servidor
 * convertiría la página pública en un directorio de clientes -cualquiera
 * escribiría "Juan" y se llevaría correos y teléfonos ajenos-. Esto no
 * consulta nada: solo le devuelve a la persona lo que ella misma escribió en
 * ese mismo dispositivo.
 *
 * Por si el teléfono es compartido (una tablet en el local, el celular de la
 * casa), la pantalla avisa que los completó y ofrece "No soy yo", que llama a
 * `olvidarDatosDelCliente`.
 */
export type DatosDelCliente = {
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
};

/**
 * Separado por barbería: un mismo teléfono puede reservar en dos barberías
 * distintas, y borrar los datos en una no tiene por qué borrarlos en la otra.
 */
const clave = () => `bt:cliente:${window.location.hostname}`;

/** null si no hay nada guardado, si está corrupto o si el navegador no deja leer. */
export function leerDatosDelCliente(): DatosDelCliente | null {
  try {
    const crudo = window.localStorage.getItem(clave());
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Partial<DatosDelCliente> | null;
    if (
      typeof datos?.clientName !== 'string' ||
      typeof datos?.clientEmail !== 'string' ||
      typeof datos?.clientWhatsApp !== 'string'
    ) {
      return null;
    }
    return { clientName: datos.clientName, clientEmail: datos.clientEmail, clientWhatsApp: datos.clientWhatsApp };
  } catch {
    // Safari en navegación privada lanza al tocar localStorage. No es un error
    // que deba interrumpir una reserva: simplemente no hay atajo.
    return null;
  }
}

export function guardarDatosDelCliente(datos: DatosDelCliente): void {
  try {
    window.localStorage.setItem(clave(), JSON.stringify(datos));
  } catch {
    // Sin espacio o sin permiso: la reserva ya se hizo, esto era solo comodidad.
  }
}

export function olvidarDatosDelCliente(): void {
  try {
    window.localStorage.removeItem(clave());
  } catch {
    // Nada que hacer: si no se puede leer tampoco se podrá volver a precargar.
  }
}
