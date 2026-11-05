import { adminDb, isFirebaseConfigured } from './firebaseAdmin';
import { sendReminderEmail } from './email';
import { logger } from './logger';
import { DEFAULT_TENANT_SLUG } from './tenant';
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

export type AppointmentHit = {
  id: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  time: string;
  source: 'firebase';
  /** Barbería de la cita (para respetar su configuración de notificaciones). */
  tenantSlug: string;
  /** Documento de Firestore de la cita (solo source = 'firebase'). */
  ref?: FirebaseFirestore.DocumentReference;
};

/** Colecciones de citas: la de cada barbería + la colección antigua (barbería por defecto). */
async function appointmentCollections(
  db: FirebaseFirestore.Firestore
): Promise<{ tenantSlug: string; col: FirebaseFirestore.CollectionReference }[]> {
  // listDocuments incluye barberías sin documento propio pero con citas (p. ej. la por defecto)
  const tenantRefs = await db.collection('tenants').listDocuments();
  const slugs = new Set(tenantRefs.map((r) => r.id));
  slugs.add(DEFAULT_TENANT_SLUG);
  return [
    ...Array.from(slugs).map((slug) => ({
      tenantSlug: slug,
      col: db.collection('tenants').doc(slug).collection('appointments'),
    })),
    { tenantSlug: DEFAULT_TENANT_SLUG, col: db.collection('appointments') },
  ];
}

export async function findUpcomingAppointments(
  from: { date: string; time: string },
  to: { date: string; time: string }
): Promise<AppointmentHit[]> {
  const hits: AppointmentHit[] = [];
  const fromKey = `${from.date}T${from.time}`;
  const toKey = `${to.date}T${to.time}`;
  const dates = Array.from(new Set([from.date, to.date]));

  if (isFirebaseConfigured) {
    let collections: Awaited<ReturnType<typeof appointmentCollections>> = [];
    try {
      collections = await appointmentCollections(adminDb());
    } catch (err) {
      logger.warn('reminder_tenants_list_failed', { error: String(err) });
    }
    for (const { tenantSlug, col } of collections) {
      // Cada barbería por separado: un error en una no frena los avisos de las demás
      try {
        for (const date of dates) {
          const snap = await col.where('date', '==', date).get();
          for (const doc of snap.docs) {
            const d = doc.data();
            const key = `${d.date}T${d.time}`;
            if (key < fromKey || key > toKey) continue;
            if (!['pending', 'confirmed'].includes(d.status)) continue;
            if (d.reminderSent) continue;
            hits.push({
              id: doc.id,
              clientName: d.clientName,
              clientEmail: d.clientEmail,
              serviceName: d.serviceName,
              time: d.time,
              source: 'firebase',
              tenantSlug,
              ref: doc.ref,
            });
          }
        }
      } catch (err) {
        logger.warn('reminder_firebase_query_failed', { tenant: tenantSlug, error: String(err) });
      }
    }
  }

  return hits;
}

async function markReminderSent(hit: AppointmentHit): Promise<void> {
  const sentAt = new Date().toISOString();

  if (!hit.ref) return;
  try {
    await hit.ref.update({
      reminderSent: true,
      reminderSentAt: sentAt,
    });
  } catch (err) {
    logger.warn('reminder_firebase_mark_failed', { id: hit.id, error: String(err) });
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
