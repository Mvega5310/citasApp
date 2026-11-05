import { NextRequest, NextResponse } from 'next/server';
import { validateBookingPayload } from '@/lib/server/booking';
import { sendBookingNotification } from '@/lib/server/email';
import { SlotTakenError, isStoreConfigured, store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';
import { generateCancelToken } from '@/lib/server/cancelToken';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { catalogFor } from '@/lib/server/catalog';
import { emailContextFor } from '@/lib/server/settings';
import { isSlotBlocked, isSlotTaken } from '@/lib/server/appointments';


export async function POST(request: NextRequest) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;

  try {
    const body = await request.json();
    const validation = validateBookingPayload(body, catalogFor(tenantResult.tenant));

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
    let persistence: 'firestore' | 'postgres' | null = null;

    if (isStoreConfigured()) {
      try {
        [id] = await store().createAppointments(tenantSlug, [booking]);
        persistence = store().backend;
      } catch (error) {
        // Otro cliente tomó el horario justo antes de guardar
        if (error instanceof SlotTakenError) {
          return NextResponse.json(
            { error: 'Este horario ya está reservado. Por favor elige otro.' },
            { status: 409 }
          );
        }
        logger.warn('booking_persist_failed', {
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
    if (id && persistence) {
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

    const emailCtx = await emailContextFor(tenantResult.tenant);
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
        brand: emailCtx.brand,
      }, emailCtx.recipients);
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
