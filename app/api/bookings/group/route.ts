import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateBookingPayload, type NormalizedBookingPayload } from '@/lib/server/booking';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { appointmentsCol, isSlotBlocked, isSlotTaken } from '@/lib/server/appointments';
import { sendGroupBookingNotification } from '@/lib/server/email';
import { logger } from '@/lib/server/logger';
import { generateGroupCancelToken } from '@/lib/server/cancelToken';

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? '';

  if (!isFirebaseConfigured) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const rawBookings: unknown[] = Array.isArray(body?.bookings) ? body.bookings : [];

    if (rawBookings.length < 2 || rawBookings.length > 3) {
      return NextResponse.json(
        { error: 'Se requieren entre 2 y 3 citas para una reserva grupal.' },
        { status: 400 }
      );
    }

    const validated: NormalizedBookingPayload[] = [];
    for (const raw of rawBookings) {
      const validation = validateBookingPayload(raw as Partial<NormalizedBookingPayload>);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      validated.push(validation.data);
    }

    const first = validated[0];
    const sameClient = validated.every(
      (b) => b.clientEmail === first.clientEmail && b.clientWhatsApp === first.clientWhatsApp
    );
    if (!sameClient) {
      return NextResponse.json(
        { error: 'Todas las citas del grupo deben ser del mismo cliente.' },
        { status: 400 }
      );
    }

    const seen = new Set<string>();
    for (const b of validated) {
      const key = `${b.date}_${b.time}`;
      if (seen.has(key)) {
        return NextResponse.json(
          { error: 'No puedes reservar el mismo horario dos veces.' },
          { status: 400 }
        );
      }
      seen.add(key);
    }

    for (const b of validated) {
      const [taken, blocked] = await Promise.all([
        isSlotTaken(b.date, b.time, tenantSlug),
        isSlotBlocked(b.date, b.time, tenantSlug),
      ]);
      if (blocked || taken) {
        return NextResponse.json(
          { error: `El horario ${b.time} del ${b.date} ya no está disponible. Por favor elige otro.` },
          { status: 409 }
        );
      }
    }

    const groupId = crypto.randomUUID();
    const db = adminDb();
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const b of validated) {
      const doc = await appointmentsCol(db, tenantSlug).add({
        ...b,
        tenantSlug,
        groupId,
        status: 'pending',
        source: 'firebase',
        createdAt: now,
        updatedAt: now,
      });
      ids.push(doc.id);
    }

    let cancelUrl: string | undefined;
    try {
      const token = await generateGroupCancelToken({
        kind: 'group',
        groupId,
        tenantSlug,
        clientName: first.clientName,
      });
      const host = request.headers.get('host') ?? 'localhost:3001';
      const protocol = host.startsWith('localhost') ? 'http' : 'https';
      cancelUrl = `${protocol}://${host}/cancelar/${token}`;
    } catch {}

    let emailSent = { sentToDefault: false, sentToClient: false };
    try {
      emailSent = await sendGroupBookingNotification({
        clientName: first.clientName,
        clientEmail: first.clientEmail,
        clientWhatsApp: first.clientWhatsApp,
        appointments: validated.map((b) => ({
          serviceName: b.serviceName,
          date: b.date,
          time: b.time,
        })),
        cancelUrl,
      });
    } catch (error) {
      logger.warn('group_booking_email_failed', {
        groupId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    return NextResponse.json({ groupId, ids, emailSent, cancelUrl }, { status: 201 });
  } catch (error) {
    logger.error('group_booking_route_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al crear las reservas' }, { status: 500 });
  }
}
