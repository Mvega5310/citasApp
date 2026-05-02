import { NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { getPool } from '@/lib/server/db';
import { sendReminderEmail } from '@/lib/server/email';
import { logger } from '@/lib/server/logger';

// Colombia is UTC-5 (no daylight saving time)
const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;

function colombiaNow(): Date {
  return new Date(Date.now() + COLOMBIA_OFFSET_MS);
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatHHMM(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured — allow (useful in dev)
  const auth = request.headers.get('authorization') ?? '';
  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  // External callers (cron-job.org) can send the same header
  return auth === `Bearer ${secret}`;
}

type AppointmentHit = {
  id: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  time: string;
  source: 'firebase' | 'postgres';
};

async function findAppointmentsAt(date: string, time: string): Promise<AppointmentHit[]> {
  const hits: AppointmentHit[] = [];

  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const snap = await db
        .collection('appointments')
        .where('date', '==', date)
        .where('time', '==', time)
        .get();

      for (const doc of snap.docs) {
        const d = doc.data();
        if (!['pending', 'confirmed'].includes(d.status)) continue;
        if (d.reminderSent) continue;
        hits.push({
          id: doc.id,
          clientName: d.clientName,
          clientEmail: d.clientEmail,
          serviceName: d.serviceName,
          time: d.time,
          source: 'firebase',
        });
      }
    } catch (err) {
      logger.warn('reminder_firebase_query_failed', { error: String(err) });
    }
  }

  // Always query Postgres as well (appointments may be stored in either)
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, client_name, client_email, service_name, appointment_time
       FROM appointments
       WHERE appointment_date = $1
         AND appointment_time = $2
         AND status IN ('pending', 'confirmed')
         AND (metadata->>'reminderSent') IS DISTINCT FROM 'true'`,
      [date, time]
    );
    for (const row of result.rows) {
      hits.push({
        id: row.id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        serviceName: row.service_name,
        time: row.appointment_time,
        source: 'postgres',
      });
    }
  } catch (err) {
    logger.warn('reminder_postgres_query_failed', { error: String(err) });
  }

  return hits;
}

async function markReminderSent(hit: AppointmentHit): Promise<void> {
  const sentAt = new Date().toISOString();

  if (hit.source === 'firebase' && isFirebaseConfigured) {
    try {
      await adminDb().collection('appointments').doc(hit.id).update({
        reminderSent: true,
        reminderSentAt: sentAt,
      });
    } catch (err) {
      logger.warn('reminder_firebase_mark_failed', { id: hit.id, error: String(err) });
    }
    return;
  }

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE appointments
       SET metadata = jsonb_set(
             jsonb_set(metadata, '{reminderSent}', 'true'),
             '{reminderSentAt}', $1::jsonb
           ),
           updated_at = now()
       WHERE id = $2`,
      [JSON.stringify(sentAt), hit.id]
    );
  } catch (err) {
    logger.warn('reminder_postgres_mark_failed', { id: hit.id, error: String(err) });
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Target = Colombia now + 5 minutes
  const target = new Date(colombiaNow().getTime() + 5 * 60 * 1000);
  const targetDate = formatDate(target);
  const targetTime = formatHHMM(target);

  const appointments = await findAppointmentsAt(targetDate, targetTime);

  if (appointments.length === 0) {
    return NextResponse.json({ sent: 0, targetDate, targetTime });
  }

  let sent = 0;
  for (const appt of appointments) {
    if (!appt.clientEmail) continue;
    const ok = await sendReminderEmail({
      clientName: appt.clientName,
      clientEmail: appt.clientEmail,
      serviceName: appt.serviceName,
      time: appt.time,
    });
    if (ok) {
      await markReminderSent(appt);
      sent++;
      logger.info('reminder_sent', { id: appt.id, time: appt.time });
    }
  }

  return NextResponse.json({ sent, targetDate, targetTime });
}
