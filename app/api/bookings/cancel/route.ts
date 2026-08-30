import { NextRequest, NextResponse } from 'next/server';
import { verifyCancelToken, msUntilAppointment, CANCEL_WINDOW_MS } from '@/lib/server/cancelToken';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { appointmentsCol } from '@/lib/server/appointments';
import { sendCancellationEmails, sendGroupCancellationEmails } from '@/lib/server/email';

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

    if (!isFirebaseConfigured) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const db = adminDb();

    if (payload.kind === 'group') {
      const { groupId, tenantSlug, clientName } = payload;

      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        return NextResponse.json(
          { error: 'Selecciona al menos una cita para cancelar.' },
          { status: 400 }
        );
      }

      const col = appointmentsCol(db, tenantSlug);
      const cancelled: { serviceName: string; date: string; time: string }[] = [];
      let anyLate = false;
      let clientEmail = '';

      for (const id of appointmentIds) {
        if (typeof id !== 'string') continue;
        const ref = col.doc(id);
        const snap = await ref.get();
        if (!snap.exists) continue;

        const data = snap.data()!;
        if (data.groupId !== groupId) continue;
        if (data.status === 'cancelled') continue;

        const isLate = msUntilAppointment(data.date, data.time) < CANCEL_WINDOW_MS;
        await ref.update({
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

      const remainingSnap = await col.where('groupId', '==', groupId).get();
      const stillActive = remainingSnap.docs
        .map((d) => d.data())
        .filter((d) => d.status !== 'cancelled')
        .map((d) => ({ serviceName: d.serviceName, date: d.date, time: d.time }));

      sendGroupCancellationEmails({
        clientName,
        clientEmail,
        cancelled,
        stillActive,
        anyLate,
      }).catch(() => {});

      return NextResponse.json({ ok: true, cancelledCount: cancelled.length, anyLate });
    }

    const { appointmentId, tenantSlug, date, time, serviceName, clientName } = payload;
    const isLate = msUntilAppointment(date, time) < CANCEL_WINDOW_MS;

    const ref = appointmentsCol(db, tenantSlug).doc(appointmentId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta cita ya fue cancelada' }, { status: 409 });
    }

    await ref.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'client',
      lateCancel: isLate,
    });

    // Fire emails without blocking the response
    sendCancellationEmails({
      clientName,
      clientEmail: data.clientEmail,
      serviceName,
      date,
      time,
      isLate,
    }).catch(() => {});

    return NextResponse.json({ ok: true, isLate });
  } catch {
    return NextResponse.json({ error: 'Error al cancelar la cita' }, { status: 500 });
  }
}
