import { ACTIVE_STATUSES, isStoreConfigured, store } from './data';

// Ante un error de la base se responde "libre": la base vuelve a comprobarlo al
// guardar (en Postgres, una restricción impide dos citas activas en el mismo horario).

export async function isSlotBlocked(date: string, time: string, tenantSlug: string): Promise<boolean> {
  if (!isStoreConfigured()) return false;
  try {
    return (await store().blockedSlots(tenantSlug, date)).includes(time);
  } catch {
    return false;
  }
}

export async function isSlotTaken(date: string, time: string, tenantSlug: string): Promise<boolean> {
  if (!isStoreConfigured()) return false;
  try {
    const sameDay = await store().appointmentsOnDate(tenantSlug, date);
    return sameDay.some((a) => a.time === time && ACTIVE_STATUSES.includes(a.status));
  } catch {
    return false;
  }
}
