import type { Service } from '@/types';
import { defaultCatalog, defaultServiceEntries, type Catalog, type DaySchedule, type WeekSchedule } from '../shared/services';
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

// ── Edición del catálogo (panel admin) ─────────────────────────────────────

export type DayKey = (typeof DAY_KEYS)[number];
export type EditableService = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
};
export type EditableHours = Record<DayKey, { open: string; close: string; closed: boolean }>;
export type EditableCatalog = { services: EditableService[]; workingHours: EditableHours };

const SERVICE_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const MAX_SERVICES = 50;

function toEditableService(raw: unknown): EditableService | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string' || typeof s.name !== 'string') return null;
  return {
    id: s.id,
    name: s.name,
    description: typeof s.description === 'string' ? s.description : '',
    duration: Number(s.duration) || 30,
    price: Number(s.price) || 0,
    active: s.active !== false,
  };
}

function scheduleToHours(schedule: WeekSchedule): EditableHours {
  return Object.fromEntries(
    DAY_KEYS.map((key, i) => {
      const d = schedule[i];
      // Día sin horas propias: cerrado, con 09:00–18:00 como valor inicial al abrirlo
      if (!d || d.start === d.end) return [key, { open: '09:00', close: '18:00', closed: true }];
      return [key, { open: d.start, close: d.end, closed: d.closed === true }];
    })
  ) as EditableHours;
}

/** Catálogo en formato editable, incluidos los servicios desactivados. */
export function editableCatalogFor(tenant: RequestTenant): EditableCatalog {
  const isDefault = tenant.slug === DEFAULT_TENANT_SLUG;
  const config = tenant.config as (Record<string, unknown> & { services?: unknown; workingHours?: unknown }) | null;

  const services = Array.isArray(config?.services)
    ? config!.services.map(toEditableService).filter((s): s is EditableService => s !== null)
    : isDefault
      ? defaultServiceEntries.map((s) => toEditableService(s)!)
      : [];

  const stored = parseSchedule(config?.workingHours);
  const workingHours = scheduleToHours(stored ?? (isDefault ? defaultCatalog.schedule : CLOSED_WEEK));

  return { services, workingHours };
}

type CatalogValidation = { ok: true; data: EditableCatalog } | { ok: false; error: string };

/** Valida el catálogo enviado por el admin antes de guardarlo. */
export function validateCatalogInput(body: unknown): CatalogValidation {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Cuerpo inválido' };
  const input = body as Record<string, unknown>;

  if (!Array.isArray(input.services)) return { ok: false, error: 'La lista de servicios es obligatoria' };
  if (input.services.length > MAX_SERVICES) return { ok: false, error: `Máximo ${MAX_SERVICES} servicios` };

  const services: EditableService[] = [];
  const ids = new Set<string>();
  for (const [i, raw] of input.services.entries()) {
    const n = i + 1;
    if (!raw || typeof raw !== 'object') return { ok: false, error: `Servicio ${n} inválido` };
    const s = raw as Record<string, unknown>;
    const id = typeof s.id === 'string' ? s.id.trim() : '';
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    const description = typeof s.description === 'string' ? s.description.trim() : '';
    const duration = Number(s.duration);
    const price = Number(s.price);

    if (!SERVICE_ID_RE.test(id)) return { ok: false, error: `Servicio ${n}: identificador inválido` };
    if (ids.has(id)) return { ok: false, error: `Servicio ${n}: identificador repetido (${id})` };
    if (name.length < 2 || name.length > 60) return { ok: false, error: `Servicio ${n}: el nombre debe tener entre 2 y 60 caracteres` };
    if (description.length > 200) return { ok: false, error: `Servicio "${name}": la descripción es demasiado larga` };
    if (!Number.isInteger(duration) || duration < 5 || duration > 480 || duration % 5 !== 0) {
      return { ok: false, error: `Servicio "${name}": la duración debe ser de 5 a 480 minutos, en múltiplos de 5` };
    }
    if (!Number.isInteger(price) || price < 0 || price > 10_000_000) {
      return { ok: false, error: `Servicio "${name}": el precio no es válido` };
    }
    if (typeof s.active !== 'boolean') return { ok: false, error: `Servicio "${name}": falta indicar si está activo` };

    ids.add(id);
    services.push({ id, name, description, duration, price, active: s.active });
  }

  const hoursInput = input.workingHours as Record<string, unknown> | undefined;
  if (!hoursInput || typeof hoursInput !== 'object') return { ok: false, error: 'El horario es obligatorio' };

  const workingHours = {} as EditableHours;
  for (const key of DAY_KEYS) {
    const d = hoursInput[key] as Record<string, unknown> | undefined;
    if (!d || typeof d !== 'object') return { ok: false, error: `Falta el horario del ${key}` };
    const open = typeof d.open === 'string' ? d.open : '';
    const close = typeof d.close === 'string' ? d.close : '';
    const closed = d.closed === true;
    if (!HHMM.test(open) || !HHMM.test(close)) return { ok: false, error: `Horario del ${key}: hora inválida` };
    if (!closed && toMinutes(open) >= toMinutes(close)) {
      return { ok: false, error: `Horario del ${key}: la hora de cierre debe ser posterior a la de apertura` };
    }
    workingHours[key] = { open, close, closed };
  }

  return { ok: true, data: { services, workingHours } };
}
