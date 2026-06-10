import { NextRequest, NextResponse } from 'next/server';
import { validateBookingPayload } from '@/lib/server/booking';
import { ensureSchema, getPool } from '@/lib/server/db';
import { sendBookingNotification } from '@/lib/server/email';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { logger } from '@/lib/server/logger';
import { generateCancelToken } from '@/lib/server/cancelToken';

function appointmentsCol(db: FirebaseFirestore.Firestore, tenantSlug: string) {
  return tenantSlug
    ? db.collection('tenants').doc(tenantSlug).collection('appointments')
    : db.collection('appointments');
}

async function isSlotBlocked(date: string, time: string, tenantSlug: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  try {
    const db = adminDb();
    const base = tenantSlug
      ? db.collection('tenants').doc(tenantSlug).collection('blocked_slots')
      : db.collection('blocked_slots');
    const snap = await base.doc(date).get();
    if (!snap.exists) return false;
    const slots: string[] = snap.data()?.slots ?? [];
    return slots.includes(time);
  } catch {
    return false;
  }
}

async function isSlotTaken(date: string, time: string, tenantSlug: string): Promise<boolean> {
  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      const snap = await appointmentsCol(db, tenantSlug)
        .where('date', '==', date)
        .where('time', '==', time)
        .get();
      return snap.docs.some((d) => ['pending', 'confirmed'].includes(d.data().status));
    } catch {
      // fall through
    }
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 1 FROM appointments
       WHERE appointment_date = $1 AND appointment_time = $2
         AND status IN ('pending', 'confirmed') LIMIT 1`,
      [date, time]
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';

  try {
    const body = await request.json();
    const validation = validateBookingPayload(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const booking = validation.data;

    const [taken, blocked] = await Promise.all([
      isSlotTaken(booking.date, booking.time, tenantSlug),
      isSlotBlocked(booking.date, booking.time, tenantSlug),
    ]);

    if (blocked) {
      return NextResponse.json(
        { error: 'Este horario no está disponible en este momento. Por favor elige otro.' },
        { status: 409 }
      );
    }

    if (taken) {
      return NextResponse.json(
        { error: 'Este horario ya está reservado. Por favor elige otro.' },
        { status: 409 }
      );
    }

    let id: string | null = null;
    let persistence: 'firebase' | 'postgres' | null = null;

    if (isFirebaseConfigured) {
      try {
        const db = adminDb();
        const now = new Date();
        const doc = await appointmentsCol(db, tenantSlug).add({
          ...booking,
          tenantSlug,
          status: 'pending',
          source: 'firebase',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        id = doc.id;
        persistence = 'firebase';
      } catch (error) {
        logger.warn('booking_firebase_persist_failed', {
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    if (!id) {
      try {
        await ensureSchema();
        const pool = getPool();
        const result = await pool.query(
          `INSERT INTO appointments(
            service_id, service_name, client_name, client_email,
            client_whatsapp, appointment_date, appointment_time, status, source, metadata
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [
            booking.serviceId, booking.serviceName, booking.clientName,
            booking.clientEmail, booking.clientWhatsApp, booking.date, booking.time,
            'pending', 'postgres',
            JSON.stringify({
              tenantSlug,
              habeasDataAccepted: booking.habeasDataAccepted,
              notificationsAccepted: booking.notificationsAccepted,
            }),
          ]
        );
        id = result.rows[0]?.id ?? null;
        persistence = 'postgres';
      } catch (error) {
        logger.error('booking_postgres_persist_failed', {
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    if (!id || !persistence) {
      return NextResponse.json(
        { error: 'No fue posible guardar la reserva en este momento.' },
        { status: 503 }
      );
    }

    let cancelUrl: string | undefined;
    if (id && persistence === 'firebase') {
      try {
        const token = await generateCancelToken({
          appointmentId: id,
          tenantSlug,
          date: booking.date,
          time: booking.time,
          serviceName: booking.serviceName,
          clientName: booking.clientName,
        });
        const host = request.headers.get('host') ?? 'localhost:3001';
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        cancelUrl = `${protocol}://${host}/cancelar/${token}`;
      } catch {}
    }

    let emailSent = { sentToDefault: false, sentToClient: false };
    try {
      emailSent = await sendBookingNotification({
        serviceName: booking.serviceName,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        clientWhatsApp: booking.clientWhatsApp,
        date: booking.date,
        time: booking.time,
        cancelUrl,
      });
    } catch (error) {
      logger.warn('booking_email_failed', {
        bookingId: id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    return NextResponse.json({ id, emailSent, persistence, cancelUrl }, { status: 201 });
  } catch (error) {
    logger.error('booking_route_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 });
  }
}
