import { isStoreConfigured, store, type AppointmentRecord } from './data';
import { sendReminderEmail } from './email';
import { logger } from './logger';
import { emailContextFor, tenantFromSlug } from './settings';
import type { EmailBrand } from './email';

// Se avisa a las citas que empiezan dentro de esta ventana (en minutos).
// Una ventana —en vez del minuto exacto— hace que el aviso no se pierda si el
// cron corre cada 5 minutos o llega con retraso; reminderSent evita repetirlo.
const REMINDER_WINDOW_MIN = 10;

// Colombia is UTC-5 (no daylight saving time)
const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatHHMM(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export type AppointmentHit = AppointmentRecord;

/** Citas activas, sin recordatorio, que empiezan dentro de la ventana [from, to] (todas las barberías). */
export async function findUpcomingAppointments(
  from: { date: string; time: string },
  to: { date: string; time: string }
): Promise<AppointmentHit[]> {
  if (!isStoreConfigured()) return [];
  const fromKey = `${from.date}T${from.time}`;
  const toKey = `${to.date}T${to.time}`;
  const dates = Array.from(new Set([from.date, to.date]));
  try {
    const candidates = await store().reminderCandidates(dates);
    return candidates.filter((a) => {
      const key = `${a.date}T${a.time}`;
      return key >= fromKey && key <= toKey;
    });
  } catch (err) {
    logger.warn('reminder_query_failed', { error: String(err) });
    return [];
  }
}

async function markReminderSent(hit: AppointmentHit): Promise<void> {
  try {
    await store().updateAppointment(hit.tenantSlug, hit.id, { reminderSentAt: new Date().toISOString() });
  } catch (err) {
    logger.warn('reminder_mark_failed', { id: hit.id, error: String(err) });
  }
}

/** Envía los recordatorios de las citas que empiezan en los próximos minutos (todas las barberías). */
export async function runReminders(nowMs: number = Date.now()): Promise<{
  sent: number;
  skipped: number;
  targetDate: string;
  targetTime: string;
}> {
  const now = new Date(nowMs + COLOMBIA_OFFSET_MS);
  const target = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60 * 1000);
  const targetDate = formatDate(target);
  const targetTime = formatHHMM(target);

  const appointments = await findUpcomingAppointments(
    { date: formatDate(now), time: formatHHMM(now) },
    { date: targetDate, time: targetTime }
  );

  if (appointments.length === 0) {
    return { sent: 0, skipped: 0, targetDate, targetTime };
  }

  // Configuración de notificaciones de cada barbería (una consulta por barbería)
  const contexts = new Map<string, { client: boolean; brand: EmailBrand }>();
  let sent = 0;
  let skipped = 0;
  for (const appt of appointments) {
    if (!appt.clientEmail) continue;
    if (!contexts.has(appt.tenantSlug)) {
      const ctx = await emailContextFor(await tenantFromSlug(appt.tenantSlug));
      contexts.set(appt.tenantSlug, { client: ctx.recipients.client, brand: ctx.brand });
    }
    const ctx = contexts.get(appt.tenantSlug)!;
    if (!ctx.client) {
      skipped++;
      continue;
    }
    const ok = await sendReminderEmail({
      clientName: appt.clientName,
      clientEmail: appt.clientEmail,
      serviceName: appt.serviceName,
      time: appt.time,
      brand: ctx.brand,
    });
    if (ok) {
      await markReminderSent(appt);
      sent++;
      logger.info('reminder_sent', { id: appt.id, tenant: appt.tenantSlug, time: appt.time });
    }
  }

  return { sent, skipped, targetDate, targetTime };
}
