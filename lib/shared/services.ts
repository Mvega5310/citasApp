import type { Service } from '../../types/index';

export type ServiceEntry = Service & { active?: boolean };

const allServices: ServiceEntry[] = [
  {
    id: 'manicure',
    name: 'Manicure',
    description: 'Manicure completo con esmaltado semipermanente',
    duration: 60,
    price: 25000,
    icon: '💅',
    active: false,
  },
  {
    id: 'pedicure',
    name: 'Pedicure',
    description: 'Pedicure completo con esmaltado semipermanente',
    duration: 75,
    price: 30000,
    icon: '🦶',
    active: false,
  },
  {
    id: 'blower',
    name: 'Blower',
    description: 'Secado y peinado profesional',
    duration: 45,
    price: 20000,
    icon: '💇‍♀️',
    active: false,
  },
  {
    id: 'corte-cabello',
    name: 'Corte de Cabello',
    description: 'Corte de cabello profesional para hombres',
    duration: 30,
    price: 12000,
    icon: '✂️',
  },
  {
    id: 'corte-barba',
    name: 'Corte y Barba',
    description: 'Corte de cabello y barba completo',
    duration: 45,
    price: 15000,
    icon: '🧔',
  },
  {
    id: 'cejas',
    name: 'Cejas',
    description: 'Diseño y depilación de cejas',
    duration: 10,
    price: 3000,
    icon: '👁️',
  },
  {
    id: 'solo-barba',
    name: 'Solo Barba',
    description: 'Arreglo y diseño de barba',
    duration: 25,
    price: 3000,
    icon: '🪒',
  },
];

export const services: Service[] = allServices.filter((s) => s.active !== false);

/** Lista original completa (incluye los servicios desactivados), para el editor del admin. */
export const defaultServiceEntries: ServiceEntry[] = allServices;

export const getServiceById = (id: string): Service | undefined => {
  return services.find((service) => service.id === id);
};

export const getServicePrice = (id: string): number => {
  const service = getServiceById(id);
  return service?.price || 0;
};

export const getServiceDuration = (id: string): number => {
  const service = getServiceById(id);
  return service?.duration || 0;
};

// Horario de un día y de la semana (0=Domingo...6=Sábado)
export type DaySchedule = { start: string; end: string; closed?: boolean };
export type WeekSchedule = Record<number, DaySchedule>;

/** Catálogo de una barbería: servicios activos y horario general. */
export type Catalog = { services: Service[]; schedule: WeekSchedule };

/**
 * Lo que devuelve /api/catalog: el catálogo más el nombre del negocio.
 *
 * El nombre va aquí y no dentro de Catalog porque Catalog lo arma `catalogFor`,
 * que es síncrono y no consulta la base, mientras que el nombre vive en la
 * configuración de cada barbería y hay que leerlo. Separarlos evita que la
 * validación de reservas, que también usa Catalog, cargue algo que no necesita.
 */
export type PublicCatalog = Catalog & {
  salonName: string;
  /** Equipo activo. Vacío si la barbería no usa barberos. */
  barbers: { id: string; name: string }[];
  /**
   * Contacto público de ESTA barbería. Cadena vacía = todavía no lo
   * configuró, nunca el dato de otra: `/contacto` tenía el WhatsApp, correo
   * y dirección de Marcos escritos a mano, así que cualquier otra barbería
   * (p. ej. Darlyn) le mostraba a sus clientes los datos personales de
   * Marcos. Estos campos existen desde el principio en `SalonSettings`, lo
   * que faltaba era exponerlos aquí.
   */
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    instagram: string;
    facebook: string;
  };
};

// Horarios por día de la semana (0=Domingo...6=Sábado)
export const workingSchedule: WeekSchedule = {
  0: { start: '09:00', end: '17:00' },
  1: { start: '09:00', end: '19:00' },
  2: { start: '09:00', end: '19:00' },
  3: { start: '09:00', end: '19:00' },
  4: { start: '09:00', end: '19:00' },
  5: { start: '09:00', end: '19:00' },
  6: { start: '09:00', end: '19:00' },
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const getAvailableHoursForDate = (
  dateStr: string,
  serviceDuration = 30,
  schedule: WeekSchedule = workingSchedule
): string[] => {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const rule = schedule[date.getDay()];
  if (!rule || rule.closed) return [];

  const start = toMinutes(rule.start);
  const end = toMinutes(rule.end);
  const slots: string[] = [];
  const now = new Date();
  const isSameLocalDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  for (let t = start; t <= end - serviceDuration; t += 30) {
    if (isSameLocalDay) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (t <= currentMinutes) continue;
    }
    slots.push(toHHMM(t));
  }

  return slots;
};

export const isOpenDay = (date: Date, schedule: WeekSchedule = workingSchedule): boolean => {
  const rule = schedule[date.getDay()];
  return !!(rule && !rule.closed);
};

const ABREVIATURA_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Lunes a domingo: es como la gente de aquí espera leer un horario. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/**
 * El horario de la semana, agrupado en filas legibles ("Lun – Sáb: 9:00 –
 * 19:00", "Domingo: Cerrado") en vez de un renglón por día.
 *
 * Usado en `/contacto`, que antes tenía el horario escrito a mano -el mismo
 * problema que el resto del contacto: no era por barbería-.
 */
export function resumenSemanal(schedule: WeekSchedule): { dias: string; texto: string }[] {
  const clave = (dia: number) => {
    const d = schedule[dia];
    return !d || d.closed ? 'cerrado' : `${d.start}-${d.end}`;
  };

  const filas: { dias: string; texto: string }[] = [];
  let i = 0;
  while (i < ORDEN_SEMANA.length) {
    const actual = clave(ORDEN_SEMANA[i]);
    let j = i;
    while (j + 1 < ORDEN_SEMANA.length && clave(ORDEN_SEMANA[j + 1]) === actual) j++;

    const nombres = ORDEN_SEMANA.slice(i, j + 1).map((d) => ABREVIATURA_DIA[d]);
    const dias = nombres.length === 1 ? nombres[0] : `${nombres[0]} – ${nombres[nombres.length - 1]}`;
    const d = schedule[ORDEN_SEMANA[i]];
    filas.push({ dias, texto: actual === 'cerrado' ? 'Cerrado' : `${d.start} – ${d.end}` });
    i = j + 1;
  }
  return filas;
}

/** Catálogo de la barbería por defecto (el que existía antes del multi-tenant). */
export const defaultCatalog: Catalog = { services, schedule: workingSchedule };
