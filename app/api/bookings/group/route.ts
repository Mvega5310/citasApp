import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateBookingPayload, type NormalizedBookingPayload } from '@/lib/server/booking';
import { isStoreConfigured } from '@/lib/server/data';
import { isSlotBlocked, isSlotTaken } from '@/lib/server/appointments';
import { SlotTakenError, store } from '@/lib/server/data';
import { sendGroupBookingNotification } from '@/lib/server/email';
import { logger } from '@/lib/server/logger';
import { generateGroupCancelToken } from '@/lib/server/cancelToken';
import { appOrigin } from '@/lib/server/auth';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { catalogFor } from '@/lib/server/catalog';
import { emailContextFor } from '@/lib/server/settings';

export async function POST(request: NextRequest) {
  const tenantResult = await resolveRequestTenant(request);
  if (!tenantResult.ok) return tenantResult.response;
  const tenantSlug = tenantResult.tenant.slug;
  const catalog = catalogFor(tenantResult.tenant);

  if (!isStoreConfigured()) {
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
      const validation = validateBookingPayload(raw as Partial<NormalizedBookingPayload>, catalog);
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
    let ids: string[];
    try {
      // Todas las citas del grupo se guardan juntas: o todas o ninguna
      ids = await store().createAppointments(
        tenantSlug,
        validated.map((b) => ({ ...b, groupId }))
      );
    } catch (error) {
      if (error instanceof SlotTakenError) {
        return NextResponse.json(
          { error: 'Uno de los horarios ya no está disponible. Por favor elige otro.' },
          { status: 409 }
        );
      }
      throw error;
    }

    let cancelUrl: string | undefined;
    try {
      const token = await generateGroupCancelToken({
        kind: 'group',
        groupId,
        tenantSlug,
        clientName: first.clientName,
      });
      // Nunca desde el encabezado Host (ver app/api/bookings/route.ts)
      cancelUrl = `${appOrigin(request, tenantSlug)}/cancelar/${token}`;
    } catch {}

    const emailCtx = await emailContextFor(tenantResult.tenant);
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
        brand: emailCtx.brand,
      }, emailCtx.recipients);
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
