import type { Service } from '@/types';
import { defaultCatalog, type Catalog, type DaySchedule, type WeekSchedule } from '../shared/services';
import { DEFAULT_TENANT_SLUG, type RequestTenant } from './tenant';

// Días como se guardan en la ficha de la barbería (TenantConfig.workingHours) → índice de Date.getDay()
export const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Normaliza un servicio guardado; devuelve null si está incompleto o desactivado. */
function parseService(raw: unknown): Service | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (s.active === false) return null;
  if (typeof s.id !== 'string' || !s.id.trim()) return null;
  if (typeof s.name !== 'string' || !s.name.trim()) return null;
  const duration = Number(s.duration);
  const price = Number(s.price);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  return {
    id: s.id.trim(),
    name: s.name.trim(),
    description: typeof s.description === 'string' ? s.description : '',
    duration,
    price,
    icon: typeof s.icon === 'string' ? s.icon : '',
  };
}

/** Convierte workingHours ({ lunes: { open, close, closed } … }) al formato por índice de día. */
function parseSchedule(raw: unknown): WeekSchedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const hours = raw as Record<string, unknown>;
  const schedule: WeekSchedule = {};
  let anyDay = false;

  DAY_KEYS.forEach((key, index) => {
    const day = hours[key] as Record<string, unknown> | undefined;
    if (!day || typeof day !== 'object') {
      schedule[index] = { start: '00:00', end: '00:00', closed: true };
      return;
    }
    anyDay = true;
    const open = typeof day.open === 'string' ? day.open : '';
    const close = typeof day.close === 'string' ? day.close : '';
    const valid = HHMM.test(open) && HHMM.test(close) && toMinutes(open) < toMinutes(close);
    const entry: DaySchedule = valid
      ? { start: open, end: close, closed: day.closed === true }
      : { start: '00:00', end: '00:00', closed: true };
    schedule[index] = entry;
  });

  return anyDay ? schedule : null;
}

const CLOSED_WEEK: WeekSchedule = Object.fromEntries(
  DAY_KEYS.map((_, i) => [i, { start: '00:00', end: '00:00', closed: true }])
);

/**
 * Catálogo (servicios + horario general) de una barbería.
 * - Si la barbería tiene servicios/horario en su ficha, se usan esos.
 * - La barbería por defecto, sin ficha, conserva el catálogo original de services.ts.
 * - Una barbería nueva sin configurar no muestra servicios y aparece cerrada
 *   (nunca hereda los servicios de otra barbería).
 */
export function catalogFor(tenant: RequestTenant): Catalog {
  const isDefault = tenant.slug === DEFAULT_TENANT_SLUG;
  const config = tenant.config as (Record<string, unknown> & { services?: unknown; workingHours?: unknown }) | null;

  const storedServices = Array.isArray(config?.services)
    ? config!.services.map(parseService).filter((s): s is Service => s !== null)
    : null;
  const storedSchedule = parseSchedule(config?.workingHours);

  return {
    services: storedServices ?? (isDefault ? defaultCatalog.services : []),
    schedule: storedSchedule ?? (isDefault ? defaultCatalog.schedule : CLOSED_WEEK),
  };
}
