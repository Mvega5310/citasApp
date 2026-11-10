import { NextRequest, NextResponse } from 'next/server';
import { validateBookingPayload } from '@/lib/server/booking';
import { sendBookingNotification } from '@/lib/server/email';
import { SlotTakenError, isStoreConfigured, store } from '@/lib/server/data';
import { logger } from '@/lib/server/logger';
import { generateCancelToken } from '@/lib/server/cancelToken';
import { appOrigin } from '@/lib/server/auth';
import { resolveRequestTenant } from '@/lib/server/tenant';
import { catalogFor } from '@/lib/server/catalog';
import { emailContextFor } from '@/lib/server/settings';
import { isSlotBlocked, isSlotTaken } from '@/lib/server/appointments';
import { resolverBarbero } from '@/lib/server/barbers';


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

    const blocked = await isSlotBlocked(booking.date, booking.time, tenantSlug);
    if (blocked) {
      return NextResponse.json(
        { error: 'Este horario no está disponible en este momento. Por favor elige otro.' },
        { status: 409 }
      );
    }

    // Quién atiende. Con barberos configurados, esto ya comprueba la
    // disponibilidad de la persona; sin ellos hay que seguir mirando la franja.
    const barbero = await resolverBarbero(
      tenantSlug,
      booking.date,
      booking.time,
      typeof body?.barberId === 'string' ? body.barberId.trim() : null
    );
    if (!barbero.ok) {
      return NextResponse.json({ error: barbero.error }, { status: barbero.status });
    }

    if (barbero.candidatos.length === 0 && (await isSlotTaken(booking.date, booking.time, tenantSlug))) {
      return NextResponse.json(
        { error: 'Este horario ya está reservado. Por favor elige otro.' },
        { status: 409 }
      );
    }

    let id: string | null = null;
    let persistence: 'firestore' | 'postgres' | null = null;
    let asignado: string | null = null;

    if (isStoreConfigured()) {
      // Con "cualquiera disponible" se prueba con el siguiente libre si alguien
      // se adelantó: la base es la que decide, no la comprobación de antes.
      const intentos = barbero.candidatos.length > 0 ? barbero.candidatos : [barbero.barberId];
      for (const candidato of intentos) {
        try {
          [id] = await store().createAppointments(tenantSlug, [{ ...booking, barberId: candidato }]);
          persistence = store().backend;
          asignado = candidato;
          break;
        } catch (error) {
          if (error instanceof SlotTakenError) continue;
          logger.warn('booking_persist_failed', {
            error: error instanceof Error ? error.message : 'unknown',
          });
          break;
        }
      }
      if (!id && persistence === null) {
        return NextResponse.json(
          { error: 'Este horario ya está reservado. Por favor elige otro.' },
          { status: 409 }
        );
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
        // Nunca desde el encabezado Host: con un Host falso el correo del
        // cliente llevaría el enlace (y el token) al dominio del atacante.
        cancelUrl = `${appOrigin(request, tenantSlug)}/cancelar/${token}`;
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
