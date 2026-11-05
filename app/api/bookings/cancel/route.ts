import { NextRequest, NextResponse } from 'next/server';
import { verifyCancelToken, msUntilAppointment, CANCEL_WINDOW_MS } from '@/lib/server/cancelToken';
import { isStoreConfigured, store } from '@/lib/server/data';
import { sendCancellationEmails, sendGroupCancellationEmails } from '@/lib/server/email';
import { emailContextFor, tenantFromSlug } from '@/lib/server/settings';

export async function POST(request: NextRequest) {
  try {
    const { token, appointmentIds } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const payload = await verifyCancelToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 400 });
    }

    if (!isStoreConfigured()) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const dataStore = store();

    if (payload.kind === 'group') {
      const { groupId, tenantSlug, clientName } = payload;

      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        return NextResponse.json(
          { error: 'Selecciona al menos una cita para cancelar.' },
          { status: 400 }
        );
      }

      const cancelled: { serviceName: string; date: string; time: string }[] = [];
      let anyLate = false;
      let clientEmail = '';

      for (const id of appointmentIds) {
        if (typeof id !== 'string') continue;
        const data = await dataStore.getAppointment(tenantSlug, id);
        if (!data) continue;
        if (data.groupId !== groupId) continue;
        if (data.status === 'cancelled') continue;

        const isLate = msUntilAppointment(data.date, data.time) < CANCEL_WINDOW_MS;
        await dataStore.updateAppointment(tenantSlug, id, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'client',
          lateCancel: isLate,
        });

        if (isLate) anyLate = true;
        clientEmail = data.clientEmail;
        cancelled.push({ serviceName: data.serviceName, date: data.date, time: data.time });
      }

      if (cancelled.length === 0) {
        return NextResponse.json(
          { error: 'No fue posible cancelar las citas seleccionadas.' },
          { status: 409 }
        );
      }

      const stillActive = (await dataStore.appointmentsInGroup(tenantSlug, groupId))
        .filter((d) => d.status !== 'cancelled')
        .map((d) => ({ serviceName: d.serviceName, date: d.date, time: d.time }));

      const emailCtx = await emailContextFor(await tenantFromSlug(tenantSlug));
      await sendGroupCancellationEmails({
        clientName,
        clientEmail,
        cancelled,
        stillActive,
        anyLate,
        brand: emailCtx.brand,
      }, emailCtx.recipients);

      return NextResponse.json({ ok: true, cancelledCount: cancelled.length, anyLate });
    }

    const { appointmentId, tenantSlug, date, time, serviceName, clientName } = payload;
    const isLate = msUntilAppointment(date, time) < CANCEL_WINDOW_MS;

    const data = await dataStore.getAppointment(tenantSlug, appointmentId);

    if (!data) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    if (data.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta cita ya fue cancelada' }, { status: 409 });
    }

    await dataStore.updateAppointment(tenantSlug, appointmentId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'client',
      lateCancel: isLate,
    });

    const emailCtx = await emailContextFor(await tenantFromSlug(tenantSlug));
    await sendCancellationEmails({
      clientName,
      clientEmail: data.clientEmail,
      serviceName,
      date,
      time,
      isLate,
      brand: emailCtx.brand,
    }, emailCtx.recipients);

    return NextResponse.json({ ok: true, isLate });
  } catch {
    return NextResponse.json({ error: 'Error al cancelar la cita' }, { status: 500 });
  }
}
