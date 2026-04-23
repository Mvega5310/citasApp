import { NextResponse } from 'next/server';
import { validateBookingPayload } from '@/lib/server/booking';
import { ensureSchema, getPool } from '@/lib/server/db';
import { sendBookingNotification } from '@/lib/server/email';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { logger } from '@/lib/server/logger';

async function isSlotTaken(date: string, time: string): Promise<boolean> {
  if (isFirebaseConfigured) {
    try {
      const db = adminDb();
      // Two equality filters work without composite index; filter status in memory
      const snap = await db
        .collection('appointments')
        .where('date', '==', date)
        .where('time', '==', time)
        .get();
      return snap.docs.some((d) => ['pending', 'confirmed'].includes(d.data().status));
    } catch {
      // fall through to Postgres check
    }
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 1 FROM appointments
       WHERE appointment_date = $1
         AND appointment_time = $2
         AND status IN ('pending', 'confirmed')
       LIMIT 1`,
      [date, time]
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateBookingPayload(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const booking = validation.data;

    // Slot conflict check
    const taken = await isSlotTaken(booking.date, booking.time);
    if (taken) {
      return NextResponse.json(
        { error: 'Este horario ya está reservado. Por favor elige otro.' },
        { status: 409 }
      );
    }

    let id: string | null = null;
    let persistence: 'firebase' | 'postgres' | null = null;

    // Firebase path
    if (isFirebaseConfigured) {
      try {
        const db = adminDb();
        const now = new Date();
        const doc = await db.collection('appointments').add({
          ...booking,
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

    // PostgreSQL fallback
    if (!id) {
      try {
        await ensureSchema();
        const pool = getPool();
        const result = await pool.query(
          `INSERT INTO appointments(
            service_id, service_name, client_name, client_email,
            client_whatsapp, appointment_date, appointment_time, status, source
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id`,
          [
            booking.serviceId,
            booking.serviceName,
            booking.clientName,
            booking.clientEmail,
            booking.clientWhatsApp,
            booking.date,
            booking.time,
            'pending',
            'postgres',
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

    let emailSent = { sentToDefault: false, sentToClient: false };
    try {
      emailSent = await sendBookingNotification({
        serviceName: booking.serviceName,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        clientWhatsApp: booking.clientWhatsApp,
        date: booking.date,
        time: booking.time,
      });
    } catch (error) {
      logger.warn('booking_email_failed', {
        bookingId: id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    return NextResponse.json({ id, emailSent, persistence }, { status: 201 });
  } catch (error) {
    logger.error('booking_route_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 });
  }
}
